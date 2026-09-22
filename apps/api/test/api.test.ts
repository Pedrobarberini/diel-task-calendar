import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test, { type TestContext } from 'node:test';
import { buildApp, type AppOptions } from '../src/app.js';
import type { Holiday } from '../src/holidays.js';
import type { Tag, Task } from '../src/repository.js';

type App = Awaited<ReturnType<typeof buildApp>>;
async function setup(t: TestContext, options: AppOptions = {}): Promise<App> {
  const app = await buildApp({ databasePath: ':memory:', ...options });
  t.after(async () => { await app.close(); });
  return app;
}
const taskBody = (overrides: Record<string, unknown> = {}) => ({
  title: 'Revisar apresentação',
  description: 'Conferir o calendário e os testes.',
  startsAt: '2026-09-22T12:00:00.000Z',
  durationMinutes: 60,
  tagIds: [],
  ...overrides,
});
async function createTag(app: App, name = 'Trabalho'): Promise<Tag> {
  const response = await app.inject({ method: 'POST', url: '/api/tags', payload: { name, color: '#3B82F6' } });
  assert.equal(response.statusCode, 201, response.body);
  return response.json<{ data: Tag }>().data;
}
async function createTask(app: App, overrides: Record<string, unknown> = {}): Promise<Task> {
  const response = await app.inject({ method: 'POST', url: '/api/tasks', payload: taskBody(overrides) });
  assert.equal(response.statusCode, 201, response.body);
  return response.json<{ data: Task }>().data;
}
function listUrl(query: Record<string, string>): string {
  return `/api/tasks?${new URLSearchParams(query)}`;
}

test('task CRUD normalizes timezone and replaces tags without losing creation timestamp', async (t) => {
  const app = await setup(t);
  const tag = await createTag(app);
  assert.equal(tag.color, '#3b82f6');
  const created = await createTask(app, { startsAt: '2026-09-22T09:00:00-03:00', tagIds: [tag.id] });
  assert.equal(created.startsAt, '2026-09-22T12:00:00.000Z');
  assert.deepEqual(created.tags, [tag]);
  const updated = await app.inject({ method: 'PUT', url: `/api/tasks/${created.id}`, payload: taskBody({ title: 'Entrega final', tagIds: [] }) });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json().data.createdAt, created.createdAt);
  assert.deepEqual(updated.json().data.tags, []);
  assert.equal(updated.json().data.title, 'Entrega final');
  const listed = await app.inject('/api/tasks');
  assert.equal(listed.json().data.length, 1);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` })).statusCode, 204);
  assert.deepEqual((await app.inject('/api/tasks')).json().data, []);
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/tasks/${created.id}` })).statusCode, 404);
});

test('tag rename and deletion update relationships while preserving tasks', async (t) => {
  const app = await setup(t);
  const tag = await createTag(app);
  const task = await createTask(app, { tagIds: [tag.id] });
  const renamed = await app.inject({ method: 'PUT', url: `/api/tags/${tag.id}`, payload: { name: 'Equipe', color: '#123456' } });
  assert.equal(renamed.statusCode, 200);
  assert.equal((await app.inject('/api/tasks')).json().data[0].tags[0].name, 'Equipe');
  assert.equal((await app.inject({ method: 'DELETE', url: `/api/tags/${tag.id}` })).statusCode, 204);
  const remaining = (await app.inject('/api/tasks')).json().data;
  assert.equal(remaining[0].id, task.id);
  assert.deepEqual(remaining[0].tags, []);
});

test('duplicate tag names are rejected with case-insensitive Unicode normalization', async (t) => {
  const app = await setup(t);
  const first = await createTag(app, 'Reunião');
  const duplicate = await app.inject({ method: 'POST', url: '/api/tags', payload: { name: '  REUNIÃO  ', color: '#112233' } });
  assert.equal(duplicate.statusCode, 409);
  assert.equal(duplicate.json().error.code, 'TAG_NAME_EXISTS');
  const second = await createTag(app, 'Estudos');
  const duplicateEdit = await app.inject({ method: 'PUT', url: `/api/tags/${second.id}`, payload: { name: first.name, color: '#112233' } });
  assert.equal(duplicateEdit.statusCode, 409);
  assert.equal((await app.inject('/api/tags')).json().data.length, 2);
});

test('interval filtering includes cross-midnight overlaps and excludes touching boundaries', async (t) => {
  const app = await setup(t);
  const crossing = await createTask(app, { startsAt: '2026-09-21T23:30:00Z', durationMinutes: 90 });
  await createTask(app, { startsAt: '2026-09-21T23:00:00Z', durationMinutes: 60 });
  await createTask(app, { startsAt: '2026-09-23T00:00:00Z', durationMinutes: 60 });
  const inside = await createTask(app, { startsAt: '2026-09-22T12:00:00Z' });
  const response = await app.inject(listUrl({ from: '2026-09-22T00:00:00Z', to: '2026-09-23T00:00:00Z' }));
  assert.deepEqual(response.json().data.map((task: Task) => task.id), [crossing.id, inside.id]);
});

test('multiple tag filters use OR semantics, combining with literal title-only search', async (t) => {
  const app = await setup(t);
  const work = await createTag(app);
  const study = await createTag(app, 'Estudos');
  const one = await createTask(app, { title: 'REUNIÃO técnica', tagIds: [work.id] });
  const two = await createTask(app, { title: 'Reunião de estudos', tagIds: [study.id] });
  await createTask(app, { title: 'Ler documentação', description: 'Preparar reunião', tagIds: [study.id] });
  await createTask(app, { title: 'Reunião sem etiquetas' });
  const filtered = await app.inject(listUrl({ tagIds: `${work.id},${study.id}`, q: 'reunião' }));
  assert.deepEqual(new Set(filtered.json().data.map((task: Task) => task.id)), new Set([one.id, two.id]));
  const literal = await createTask(app, { title: "100% ' OR 1=1 --" });
  assert.equal((await app.inject(listUrl({ q: "' OR 1=1 --" }))).json().data[0].id, literal.id);
  assert.deepEqual((await app.inject(listUrl({ tagIds: randomUUID() }))).json().data, []);
});

test('unknown tags reject create and update atomically', async (t) => {
  const app = await setup(t);
  const tag = await createTag(app);
  const original = await createTask(app, { tagIds: [tag.id] });
  const invalid = { tagIds: [tag.id, randomUUID()], title: 'Should never be saved' };
  const failedCreate = await app.inject({ method: 'POST', url: '/api/tasks', payload: taskBody(invalid) });
  assert.equal(failedCreate.statusCode, 400);
  assert.equal(failedCreate.json().error.code, 'UNKNOWN_TAG');
  const failedUpdate = await app.inject({ method: 'PUT', url: `/api/tasks/${original.id}`, payload: taskBody(invalid) });
  assert.equal(failedUpdate.statusCode, 400);
  assert.deepEqual((await app.inject('/api/tasks')).json().data, [original]);
});

test('validation rejects invalid durations, dates, repeated tags and unknown fields', async (t) => {
  const app = await setup(t);
  const tag = await createTag(app);
  for (const invalid of [
    { title: ' ' }, { title: 'x'.repeat(161) }, { description: 'x'.repeat(5001) },
    { durationMinutes: 0 }, { durationMinutes: 1.5 }, { durationMinutes: 10081 },
    { startsAt: '2026-09-22T09:00:00' }, { startsAt: '2026-02-30T12:00:00Z' },
    { tagIds: [tag.id, tag.id] }, { tagIds: ['not-a-uuid'] }, { unsafe: true },
  ]) {
    const response = await app.inject({ method: 'POST', url: '/api/tasks', payload: taskBody(invalid) });
    assert.equal(response.statusCode, 400, JSON.stringify(invalid));
    assert.equal(response.json().error.code, 'VALIDATION_ERROR');
  }
  assert.equal((await app.inject(listUrl({ from: '2026-09-23T00:00:00Z', to: '2026-09-22T00:00:00Z' }))).statusCode, 400);
  assert.equal((await app.inject('/api/tasks?tagIds=invalid')).statusCode, 400);
  assert.equal((await app.inject({ method: 'POST', url: '/api/tags', payload: { name: 'Test', color: 'red' } })).statusCode, 400);
  assert.equal((await app.inject({ method: 'DELETE', url: '/api/tasks/not-a-uuid' })).statusCode, 400);
});

test('missing resources and malformed requests use the structured error contract', async (t) => {
  const app = await setup(t);
  const missing = await app.inject({ method: 'PUT', url: `/api/tasks/${randomUUID()}`, payload: taskBody() });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.json().error.code, 'TASK_NOT_FOUND');
  assert.equal((await app.inject('/api/missing')).json().error.code, 'NOT_FOUND');
  const malformed = await app.inject({ method: 'POST', url: '/api/tasks', headers: { 'content-type': 'application/json' }, payload: '{' });
  assert.equal(malformed.statusCode, 400);
  assert.equal(malformed.json().error.code, 'INVALID_REQUEST');
  const oversized = await app.inject({ method: 'POST', url: '/api/tasks', payload: taskBody({ description: 'x'.repeat(70000) }) });
  assert.equal(oversized.statusCode, 413);
});

test('API provides health, security headers and configured CORS origin', async (t) => {
  const app = await setup(t, { webOrigin: 'https://calendar.example' });
  const response = await app.inject({ url: '/api/health', headers: { origin: 'https://calendar.example' } });
  assert.deepEqual(response.json(), { status: 'ok' });
  assert.equal(response.headers['access-control-allow-origin'], 'https://calendar.example');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  const otherOrigin = await app.inject({ url: '/api/health', headers: { origin: 'https://untrusted.example' } });
  assert.notEqual(otherOrigin.headers['access-control-allow-origin'], 'https://untrusted.example');
});

test('SQLite data survives restarts and existing migration is not reapplied', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'diel-api-'));
  t.after(async () => { await rm(directory, { recursive: true, force: true }); });
  const databasePath = join(directory, 'calendar.sqlite');
  const first = await buildApp({ databasePath });
  const tag = await createTag(first);
  const created = await createTask(first, { tagIds: [tag.id] });
  await first.close();
  const second = await buildApp({ databasePath });
  try {
    assert.deepEqual((await second.inject('/api/tasks')).json().data, [created]);
    assert.deepEqual((await second.inject('/api/tags')).json().data, [tag]);
  } finally {
    await second.close();
  }
});

const providerHolidays = [
  { date: '2026-01-01', localName: 'Confraternização Universal', name: "New Year's Day", countryCode: 'BR', global: true, types: ['Public'] },
  { date: '2026-02-17', localName: 'Carnaval', name: 'Carnival', countryCode: 'BR', global: true, types: ['Bank', 'Optional'] },
  { date: '2026-07-09', localName: 'Feriado estadual', name: 'State holiday', countryCode: 'BR', global: false, types: ['Public'] },
];

test('holidays include only national public dates and cache expires after its TTL', async (t) => {
  let calls = 0;
  let now = 1000;
  const app = await setup(t, { now: () => now, holidayCacheTtlMs: 100, holidayFetcher: async (url, init) => {
    calls++;
    assert.equal(url, 'https://date.nager.at/api/v3/PublicHolidays/2026/BR');
    assert.ok(init.signal instanceof AbortSignal);
    return { ok: true, json: async () => providerHolidays };
  } });
  const first = await app.inject('/api/holidays/2026');
  assert.equal(first.statusCode, 200);
  const result: Holiday[] = first.json().data;
  assert.equal(result.length, 1);
  assert.equal(result[0]!.localName, 'Confraternização Universal');
  assert.equal('types' in result[0]!, false);
  await app.inject('/api/holidays/2026');
  assert.equal(calls, 1);
  now = 1101;
  await app.inject('/api/holidays/2026');
  assert.equal(calls, 2);
  assert.equal((await app.inject('/api/holidays/1899')).statusCode, 400);
});

test('provider failures and invalid payloads return 503 without caching errors or affecting tasks', async (t) => {
  let calls = 0;
  const app = await setup(t, { holidayFetcher: async () => {
    calls++;
    if (calls === 1) throw new Error('Network disconnected');
    if (calls === 2) return { ok: false, json: async () => ({}) };
    if (calls === 3) return { ok: true, json: async () => [{ invalid: true }] };
    return { ok: true, json: async () => providerHolidays };
  } });
  for (let i = 0; i < 3; i++) {
    const response = await app.inject('/api/holidays/2026');
    assert.equal(response.statusCode, 503);
    assert.equal(response.json().error.code, 'HOLIDAYS_UNAVAILABLE');
    assert.match(response.json().error.message, /tarefas continuam disponíveis/);
  }
  await createTask(app);
  assert.equal((await app.inject('/api/tasks')).json().data.length, 1);
  assert.equal((await app.inject('/api/holidays/2026')).statusCode, 200);
  assert.equal(calls, 4);
});

test('concurrent holiday requests share one upstream call', async (t) => {
  let calls = 0;
  const app = await setup(t, { holidayFetcher: async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 30));
    return { ok: true, json: async () => providerHolidays };
  } });
  const responses = await Promise.all([app.inject('/api/holidays/2026'), app.inject('/api/holidays/2026')]);
  assert.equal(calls, 1);
  assert.ok(responses.every((response) => response.statusCode === 200));
});
