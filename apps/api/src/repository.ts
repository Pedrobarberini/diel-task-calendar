import { randomUUID } from 'node:crypto';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import { transaction } from './database.js';
import { ApiError } from './errors.js';
import type { TagInput, TaskInput, TaskQuery } from './validation.js';

export interface Tag { id: string; name: string; color: string }
export interface Task {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  durationMinutes: number;
  tags: Tag[];
  createdAt: string;
  updatedAt: string;
}
type TaskRow = Omit<Task, 'tags'>;
const taskColumns = `id, title, description, starts_at AS startsAt,
  duration_minutes AS durationMinutes, created_at AS createdAt, updated_at AS updatedAt`;

export class Repository {
  constructor(private readonly db: DatabaseSync) {}

  listTags(): Tag[] {
    return this.db.prepare('SELECT id, name, color FROM tags ORDER BY name_key').all() as unknown as Tag[];
  }

  private requireTag(id: string): Tag {
    const tag = this.db.prepare('SELECT id, name, color FROM tags WHERE id = ?').get(id) as unknown as Tag | undefined;
    if (!tag) throw new ApiError(404, 'TAG_NOT_FOUND', 'Etiqueta não encontrada.');
    return tag;
  }

  saveTag(input: TagInput, id?: string): Tag {
    return transaction(this.db, () => {
      if (id) this.requireTag(id);
      // Unicode normalization handles accented Portuguese names consistently.
      const nameKey = input.name.normalize('NFKC').toLocaleLowerCase('pt-BR');
      const existing = this.db.prepare('SELECT id FROM tags WHERE name_key = ?').get(nameKey);
      if (existing && existing.id !== id) {
        throw new ApiError(409, 'TAG_NAME_EXISTS', 'Já existe uma etiqueta com esse nome.');
      }
      const tagId = id ?? randomUUID();
      if (id) {
        this.db.prepare('UPDATE tags SET name = ?, name_key = ?, color = ? WHERE id = ?')
          .run(input.name, nameKey, input.color, id);
      } else {
        this.db.prepare('INSERT INTO tags (id, name, name_key, color) VALUES (?, ?, ?, ?)')
          .run(tagId, input.name, nameKey, input.color);
      }
      return this.requireTag(tagId);
    });
  }

  deleteTag(id: string): void {
    const result = this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    if (!result.changes) throw new ApiError(404, 'TAG_NOT_FOUND', 'Etiqueta não encontrada.');
  }

  listTasks(query: TaskQuery): Task[] {
    const conditions: string[] = [];
    const values: SQLInputValue[] = [];
    // A task is visible whenever any part of it intersects [from, to).
    if (query.from) {
      conditions.push('(starts_at_ms + duration_minutes * 60000) > ?');
      values.push(Date.parse(query.from));
    }
    if (query.to) {
      conditions.push('starts_at_ms < ?');
      values.push(Date.parse(query.to));
    }
    if (query.tagIds.length) {
      conditions.push(`EXISTS (SELECT 1 FROM task_tags WHERE task_id = tasks.id AND tag_id IN (${query.tagIds.map(() => '?').join(',')}))`);
      values.push(...query.tagIds);
    }
    const rows = this.db.prepare(`SELECT ${taskColumns} FROM tasks
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY starts_at_ms, created_at, id`).all(...values) as unknown as TaskRow[];

    const tags = this.db.prepare(`
      SELECT tt.task_id AS taskId, t.id, t.name, t.color
      FROM task_tags tt JOIN tags t ON t.id = tt.tag_id JOIN tasks ON tasks.id = tt.task_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY t.name_key
    `).all(...values) as unknown as (Tag & { taskId: string })[];
    const tagsByTask = new Map<string, Tag[]>();
    for (const { taskId, ...tag } of tags) {
      const taskTags = tagsByTask.get(taskId) ?? [];
      taskTags.push(tag);
      tagsByTask.set(taskId, taskTags);
    }
    const search = query.q?.toLocaleLowerCase('pt-BR');
    return rows
      .filter((row) => !search || row.title.toLocaleLowerCase('pt-BR').includes(search))
      .map((row) => ({ ...row, tags: tagsByTask.get(row.id) ?? [] }));
  }

  getTask(id: string): Task {
    const row = this.db.prepare(`SELECT ${taskColumns} FROM tasks WHERE id = ?`).get(id) as unknown as TaskRow | undefined;
    if (!row) throw new ApiError(404, 'TASK_NOT_FOUND', 'Tarefa não encontrada.');
    const tags = this.db.prepare(`SELECT t.id, t.name, t.color FROM tags t
      JOIN task_tags tt ON tt.tag_id = t.id WHERE tt.task_id = ? ORDER BY t.name_key`).all(id) as unknown as Tag[];
    return { ...row, tags };
  }

  saveTask(input: TaskInput, id?: string): Task {
    return transaction(this.db, () => {
      if (id) this.getTask(id);
      for (const tagId of input.tagIds) {
        if (!this.db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId)) {
          throw new ApiError(400, 'UNKNOWN_TAG', 'Uma das etiquetas selecionadas não existe.', { tagId });
        }
      }
      const taskId = id ?? randomUUID();
      const now = new Date().toISOString();
      if (id) {
        this.db.prepare(`UPDATE tasks SET title = ?, description = ?, starts_at = ?, starts_at_ms = ?,
          duration_minutes = ?, updated_at = ? WHERE id = ?`)
          .run(input.title, input.description, input.startsAt, Date.parse(input.startsAt), input.durationMinutes, now, id);
        this.db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(id);
      } else {
        this.db.prepare(`INSERT INTO tasks
          (id, title, description, starts_at, starts_at_ms, duration_minutes, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(taskId, input.title, input.description, input.startsAt, Date.parse(input.startsAt), input.durationMinutes, now, now);
      }
      const addTag = this.db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)');
      for (const tagId of input.tagIds) addTag.run(taskId, tagId);
      return this.getTask(taskId);
    });
  }

  deleteTask(id: string): void {
    const result = this.db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    if (!result.changes) throw new ApiError(404, 'TASK_NOT_FOUND', 'Tarefa não encontrada.');
  }
}
