import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./firebase', () => ({ auth: { currentUser: null }, db: {} }));
let api: typeof import('./api').api;
const taskInput = {
  title: 'Revisar',
  description: '',
  startsAt: '2026-09-22T12:00:00.000Z',
  durationMinutes: 30,
  tagIds: [],
};

beforeEach(async () => {
  vi.stubEnv('VITE_DATA_MODE', 'rest');
  vi.resetModules();
  ({ api } = await import('./api'));
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('calendar HTTP client', () => {
  it('loads all tasks and tags for filtering in the interface', async () => {
    const tasks = [{ id: 'task-id', ...taskInput, tags: [] }];
    const tags = [{ id: 'tag-id', name: 'Trabalho', color: '#123456' }];
    const fetchMock = vi.fn(async (url: string) =>
      Response.json({ data: url.endsWith('/tasks') ? tasks : tags }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.loadCalendar()).resolves.toEqual({ tasks, tags });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(['/api/tasks', '/api/tags']);
  });

  it('deletes without an empty JSON body and accepts HTTP 204', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.deleteTask('task-id')).resolves.toBeUndefined();
    await expect(api.deleteTag('tag-id')).resolves.toBeUndefined();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      '/api/tasks/task-id',
      '/api/tags/tag-id',
    ]);
    for (const [, options] of fetchMock.mock.calls) {
      expect(options.method).toBe('DELETE');
      expect(options.body).toBeUndefined();
      expect(new Headers(options.headers).has('Content-Type')).toBe(false);
    }
  });

  it('normalizes the title and date before sending a JSON task', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: {} }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await api.saveTask({ ...taskInput, title: ' Revisar ', startsAt: '2026-09-22T09:00:00-03:00' });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tasks');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(taskInput);
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
  });

  it('updates existing tasks and returns saved tags', async () => {
    const tag = { id: 'tag-id', name: 'Trabalho', color: '#123456' };
    const fetchMock = vi.fn<typeof fetch>(async () => Response.json({ data: tag }));
    vi.stubGlobal('fetch', fetchMock);
    await api.saveTask(taskInput, 'task-id');
    await expect(api.saveTag({ name: ' Trabalho ', color: tag.color }, tag.id)).resolves.toEqual(
      tag,
    );
    expect(fetchMock.mock.calls.map(([url, options]) => [url, options?.method])).toEqual([
      ['/api/tasks/task-id', 'PUT'],
      ['/api/tags/tag-id', 'PUT'],
    ]);
  });

  it.each([0, -1, 1.5, 10081])(
    'rejects invalid duration %s before sending data',
    async (durationMinutes) => {
      const fetchMock = vi.fn();
      vi.stubGlobal('fetch', fetchMock);
      await expect(api.saveTask({ ...taskInput, durationMinutes })).rejects.toThrow('duração');
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it('rejects empty titles, invalid dates and duplicate tags', async () => {
    await expect(api.saveTask({ ...taskInput, title: ' ' })).rejects.toThrow('título');
    await expect(api.saveTask({ ...taskInput, startsAt: 'invalid' })).rejects.toThrow('data');
    await expect(api.saveTask({ ...taskInput, tagIds: ['a', 'a'] })).rejects.toThrow('etiquetas');
    await expect(api.saveTag({ name: '', color: '#123456' })).rejects.toThrow('nome');
    await expect(api.saveTag({ name: 'Trabalho', color: 'red' })).rejects.toThrow('cor');
  });

  it('preserves the message returned by the server', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          Response.json(
            { error: { message: 'Já existe uma etiqueta com esse nome.' } },
            { status: 409 },
          ),
        ),
    );
    await expect(api.saveTag({ name: 'Trabalho', color: '#123456' })).rejects.toThrow(
      'Já existe uma etiqueta com esse nome.',
    );
  });

  it('shows a useful message when a proxy returns an HTML error page', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<h1>Bad gateway</h1>', { status: 502 })),
    );
    await expect(api.loadCalendar()).rejects.toThrow(
      'Não foi possível concluir a solicitação. Tente novamente.',
    );
  });

  it('loads holidays through the local API in REST mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: [] }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.holidays(2026)).resolves.toEqual([]);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/holidays/2026');
  });
});
