import { openDatabase, transaction } from './database.js';

const db = openDatabase(process.env.DATABASE_PATH ?? './data/diel.sqlite');
const tags = [
  { id: '16abf171-8f11-4f2a-b7cd-33d6cfcc3701', name: 'Trabalho', color: '#3b82f6' },
  { id: '16abf171-8f11-4f2a-b7cd-33d6cfcc3702', name: 'Pessoal', color: '#8b5cf6' },
  { id: '16abf171-8f11-4f2a-b7cd-33d6cfcc3703', name: 'Estudos', color: '#10b981' },
];
const examples = [
  {
    id: '9c34a2e5-2ab5-4b2c-8cc7-512245427101',
    title: 'Planejar a semana',
    description: 'Organizar prioridades e revisar as entregas da equipe.',
    day: 0,
    hour: 9,
    duration: 60,
    tag: 0,
  },
  {
    id: '9c34a2e5-2ab5-4b2c-8cc7-512245427102',
    title: 'Pausa para leitura',
    description: 'Reservar um momento para aprender algo novo.',
    day: 0,
    hour: 14,
    duration: 30,
    tag: 2,
  },
  {
    id: '9c34a2e5-2ab5-4b2c-8cc7-512245427103',
    title: 'Cuidar da rotina',
    description: 'Caminhada e organização dos compromissos pessoais.',
    day: 1,
    hour: 8,
    duration: 45,
    tag: 1,
  },
  {
    id: '9c34a2e5-2ab5-4b2c-8cc7-512245427104',
    title: 'Revisar o projeto',
    description: 'Conferir os testes e preparar a apresentação técnica.',
    day: 2,
    hour: 10,
    duration: 90,
    tag: 0,
  },
];

try {
  const result = transaction(db, () => {
    let added = 0;
    const resolvedTags = tags.map((tag) => {
      const nameKey = tag.name.toLocaleLowerCase('pt-BR');
      db.prepare('INSERT OR IGNORE INTO tags (id, name, name_key, color) VALUES (?, ?, ?, ?)').run(
        tag.id,
        tag.name,
        nameKey,
        tag.color,
      );
      const existing = db
        .prepare('SELECT id FROM tags WHERE id = ? OR name_key = ? ORDER BY id LIMIT 1')
        .get(tag.id, nameKey);
      return existing?.id as string;
    });
    const now = new Date().toISOString();
    for (const example of examples) {
      // Fixed IDs make repeated seeding idempotent; existing records are never updated.
      const start = new Date();
      start.setDate(start.getDate() + example.day);
      start.setHours(example.hour, 0, 0, 0);
      const inserted = db
        .prepare(
          `INSERT OR IGNORE INTO tasks
        (id, title, description, starts_at, starts_at_ms, duration_minutes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          example.id,
          example.title,
          example.description,
          start.toISOString(),
          start.getTime(),
          example.duration,
          now,
          now,
        );
      if (inserted.changes) {
        db.prepare('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)').run(
          example.id,
          resolvedTags[example.tag]!,
        );
        added++;
      }
    }
    return added;
  });
  console.log(`Seed complete: ${result} example tasks added. Existing data was preserved.`);
} finally {
  db.close();
}
