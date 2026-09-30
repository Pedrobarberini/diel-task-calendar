import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const sdk = vi.hoisted(() => ({
  auth: { currentUser: null as { uid: string } | null },
  db: {},
  collection: vi.fn((_db: unknown, ...path: string[]) => path.join('/')),
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join('/')),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  Timestamp: { fromDate: vi.fn((date: Date) => ({ toDate: () => date })) },
}));
vi.mock('./firebase', () => ({ auth: sdk.auth, db: sdk.db }));
vi.mock('firebase/firestore', () => sdk);

let api: typeof import('./api').api;
const input = {
  title: 'Revisar tarefas',
  description: 'Conferir os horários.',
  startsAt: '2026-09-29T12:00:00.000Z',
  durationMinutes: 45,
  tagIds: ['work'],
};

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_DATA_MODE', 'firebase');
  sdk.auth.currentUser = { uid: 'alice' };
  vi.resetModules();
  ({ api } = await import('./api'));
});
afterEach(() => vi.unstubAllEnvs());

describe('calendar Firebase client', () => {
  it('rejects private reads and writes without a session', async () => {
    sdk.auth.currentUser = null;
    for (const action of [
      () => api.loadCalendar(),
      () => api.saveTask(input),
      () => api.deleteTask('task'),
      () => api.saveTag({ name: 'Trabalho', color: '#123456' }),
      () => api.deleteTag('work'),
    ]) {
      await expect(action()).rejects.toThrow('Entre na sua conta');
    }
    expect(sdk.getDocs).not.toHaveBeenCalled();
    expect(sdk.setDoc).not.toHaveBeenCalled();
    expect(sdk.updateDoc).not.toHaveBeenCalled();
    expect(sdk.deleteDoc).not.toHaveBeenCalled();
  });

  it('reads the current account and ignores deleted tags when loading tasks', async () => {
    const timestamp = { toDate: () => new Date(input.startsAt) };
    const tag = { name: 'Trabalho', color: '#123456' };
    sdk.getDocs
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'task',
            data: () => ({
              ...input,
              tagIds: ['work', 'deleted'],
              startsAt: timestamp,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
          },
        ],
      })
      .mockResolvedValueOnce({ docs: [{ id: 'work', data: () => tag }] });

    const result = await api.loadCalendar();
    expect(sdk.getDocs.mock.calls).toEqual([['users/alice/tasks'], ['users/alice/tags']]);
    expect(result.tags).toEqual([{ id: 'work', ...tag }]);
    expect(result.tasks).toEqual([
      {
        id: 'task',
        title: input.title,
        description: input.description,
        startsAt: input.startsAt,
        durationMinutes: input.durationMinutes,
        tags: result.tags,
        createdAt: input.startsAt,
        updatedAt: input.startsAt,
      },
    ]);
  });

  it('sets creation timestamps only for new tasks and updates within the same account', async () => {
    await api.saveTask(input);
    const [createdPath, created] = sdk.setDoc.mock.calls[0];
    expect(createdPath).toMatch(/^users\/alice\/tasks\/[\w-]+$/);
    expect(created).toMatchObject({
      title: input.title,
      durationMinutes: input.durationMinutes,
      tagIds: input.tagIds,
      createdAt: 'SERVER_TIMESTAMP',
      updatedAt: 'SERVER_TIMESTAMP',
    });
    expect(created.startsAt.toDate().toISOString()).toBe(input.startsAt);

    await api.saveTask({ ...input, title: 'Título alterado' }, 'task');
    const [updatedPath, updated] = sdk.updateDoc.mock.calls[0];
    expect(updatedPath).toBe('users/alice/tasks/task');
    expect(updated.title).toBe('Título alterado');
    expect(updated.updatedAt).toBe('SERVER_TIMESTAMP');
    expect(updated).not.toHaveProperty('createdAt');
    expect(sdk.setDoc).toHaveBeenCalledTimes(1);
  });

  it('keeps the legacy nameKey required by deployed tag rules on create and update', async () => {
    const tag = await api.saveTag({ name: ' Trabalho ', color: '#123456' });
    const [createdPath, created] = sdk.setDoc.mock.calls[0];
    expect(createdPath).toBe(`users/alice/tags/${tag.id}`);
    expect(created).toEqual({
      name: 'Trabalho',
      color: '#123456',
      nameKey: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
    expect(tag).toEqual({ id: tag.id, name: 'Trabalho', color: '#123456' });

    await api.saveTag({ name: 'trabalho', color: '#abcdef' }, tag.id);
    expect(sdk.updateDoc).toHaveBeenCalledWith(createdPath, {
      name: 'trabalho',
      color: '#abcdef',
      nameKey: created.nameKey,
    });
  });
});
