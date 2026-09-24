import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './rest-api';

afterEach(() => vi.unstubAllGlobals());

describe('HTTP client contract', () => {
  it('deletes tasks and tags without an empty JSON body and handles HTTP 204', async () => {
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
      // Fastify rejects Content-Type: application/json with an empty body.
      expect(new Headers(options.headers).has('Content-Type')).toBe(false);
    }
  });

  it('sends a JSON body and content type for task creation', async () => {
    const input = {
      title: 'Revisar',
      description: '',
      startsAt: '2026-09-22T12:00:00.000Z',
      durationMinutes: 30,
      tagIds: [],
    };
    const saved = { id: 'task-id', ...input, tags: [] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ data: saved }, { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(api.saveTask(input)).resolves.toEqual(saved);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/tasks');
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toEqual(input);
    expect(new Headers(options.headers).get('Content-Type')).toBe('application/json');
  });

  it('preserves structured server errors instead of returning a false success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        Response.json(
          {
            error: { code: 'TAG_NAME_EXISTS', message: 'Já existe uma etiqueta com esse nome.' },
          },
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
    await expect(api.tags()).rejects.toThrow(
      'Não foi possível concluir a solicitação. Tente novamente.',
    );
  });
});
