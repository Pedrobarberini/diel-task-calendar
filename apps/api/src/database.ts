import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { TagInput, TaskInput, TaskQuery } from './validation.js';

export interface Tag extends TagInput {
  id: string;
}
export interface Task extends Omit<TaskInput, 'tagIds'> {
  id: string;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}
type TaskRow = Omit<Task, 'tags'>;
const taskColumns = `id, title, description, starts_at AS startsAt,
  duration_minutes AS durationMinutes, created_at AS createdAt, updated_at AS updatedAt`;

export function openDatabase(filename: string): DatabaseSync {
  if (filename !== ':memory:') mkdirSync(dirname(resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
  transaction(db, () => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        name_key TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        starts_at TEXT NOT NULL,
        starts_at_ms INTEGER NOT NULL,
        duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 1 AND 10080),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS task_tags (
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, tag_id)
      );
      CREATE INDEX IF NOT EXISTS tasks_starts_at_idx ON tasks(starts_at_ms);
      CREATE INDEX IF NOT EXISTS task_tags_tag_id_idx ON task_tags(tag_id);
    `);
    db.prepare('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (?, ?)').run(
      1,
      new Date().toISOString(),
    );
  });
  return db;
}

export function transaction<T>(db: DatabaseSync, operation: () => T): T {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = operation();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

export function listTags(db: DatabaseSync): Tag[] {
  return db.prepare('SELECT id, name, color FROM tags ORDER BY name_key').all() as unknown as Tag[];
}

export function saveTag(db: DatabaseSync, input: TagInput, id?: string): Tag {
  return transaction(db, () => {
    if (id && !db.prepare('SELECT id FROM tags WHERE id = ?').get(id)) {
      throw new Error('TAG_NOT_FOUND');
    }
    const nameKey = input.name.normalize('NFKC').toLocaleLowerCase('pt-BR');
    const existing = db.prepare('SELECT id FROM tags WHERE name_key = ?').get(nameKey);
    if (existing && existing.id !== id) throw new Error('TAG_NAME_EXISTS');
    const tagId = id ?? randomUUID();
    db.prepare(
      `
      INSERT INTO tags (id, name, name_key, color) VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name = excluded.name,
        name_key = excluded.name_key, color = excluded.color
    `,
    ).run(tagId, input.name, nameKey, input.color);
    return { id: tagId, name: input.name, color: input.color };
  });
}

export function deleteTag(db: DatabaseSync, id: string): void {
  if (!db.prepare('DELETE FROM tags WHERE id = ?').run(id).changes) {
    throw new Error('TAG_NOT_FOUND');
  }
}

export function listTasks(db: DatabaseSync, query: TaskQuery): Task[] {
  const rows = db
    .prepare(
      `SELECT ${taskColumns} FROM tasks
    ORDER BY starts_at_ms, created_at, id`,
    )
    .all() as unknown as TaskRow[];
  const links = db
    .prepare(
      `
    SELECT tt.task_id AS taskId, t.id, t.name, t.color
    FROM task_tags tt JOIN tags t ON t.id = tt.tag_id ORDER BY t.name_key
  `,
    )
    .all() as unknown as (Tag & { taskId: string })[];
  const tagsByTask = new Map<string, Tag[]>();
  for (const { taskId, ...tag } of links) {
    const tags = tagsByTask.get(taskId) ?? [];
    tags.push(tag);
    tagsByTask.set(taskId, tags);
  }
  const search = query.q?.toLocaleLowerCase('pt-BR');
  const from = query.from ? Date.parse(query.from) : -Infinity;
  const to = query.to ? Date.parse(query.to) : Infinity;
  return rows
    .map((task) => ({ ...task, tags: tagsByTask.get(task.id) ?? [] }))
    .filter((task) => {
      const start = Date.parse(task.startsAt);
      const end = start + task.durationMinutes * 60000;
      return (
        start < to &&
        end > from &&
        (!search || task.title.toLocaleLowerCase('pt-BR').includes(search)) &&
        (!query.tagIds.length || task.tags.some((tag) => query.tagIds.includes(tag.id)))
      );
    });
}

export function saveTask(db: DatabaseSync, input: TaskInput, id?: string): Task {
  return transaction(db, () => {
    const previous = id
      ? db.prepare('SELECT created_at FROM tasks WHERE id = ?').get(id)
      : undefined;
    if (id && !previous) throw new Error('TASK_NOT_FOUND');
    const tags = listTags(db).filter((tag) => input.tagIds.includes(tag.id));
    const unknownTag = input.tagIds.find((tagId) => !tags.some((tag) => tag.id === tagId));
    if (unknownTag) {
      throw Object.assign(new Error('UNKNOWN_TAG'), { details: { tagId: unknownTag } });
    }
    const taskId = id ?? randomUUID();
    const now = new Date().toISOString();
    db.prepare(
      `
      INSERT INTO tasks
        (id, title, description, starts_at, starts_at_ms, duration_minutes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description,
        starts_at = excluded.starts_at, starts_at_ms = excluded.starts_at_ms,
        duration_minutes = excluded.duration_minutes, updated_at = excluded.updated_at
    `,
    ).run(
      taskId,
      input.title,
      input.description,
      input.startsAt,
      Date.parse(input.startsAt),
      input.durationMinutes,
      now,
      now,
    );
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(taskId);
    const addTag = db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)');
    for (const tagId of input.tagIds) addTag.run(taskId, tagId);
    return {
      id: taskId,
      title: input.title,
      description: input.description,
      startsAt: input.startsAt,
      durationMinutes: input.durationMinutes,
      tags,
      createdAt: previous ? String(previous.created_at) : now,
      updatedAt: now,
    };
  });
}

export function deleteTask(db: DatabaseSync, id: string): void {
  if (!db.prepare('DELETE FROM tasks WHERE id = ?').run(id).changes) {
    throw new Error('TASK_NOT_FOUND');
  }
}
