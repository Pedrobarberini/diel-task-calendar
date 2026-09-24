import type { Holiday, Tag, Task, TaskInput } from '../types';

const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    // Empty GET/DELETE requests must not advertise a JSON body.
    headers: {
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    let message = 'Não foi possível concluir a solicitação. Tente novamente.';
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      if (body.error?.message) message = body.error.message;
    } catch {
      /* Non-JSON errors still get a useful message. */
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return ((await response.json()) as { data: T }).data;
}

export const api = {
  tasks: (
    params: { from: string; to: string; q: string; tagIds: string[] },
    signal?: AbortSignal,
  ) => {
    const search = new URLSearchParams({ from: params.from, to: params.to });
    if (params.q.trim()) search.set('q', params.q.trim());
    if (params.tagIds.length) search.set('tagIds', params.tagIds.join(','));
    return request<Task[]>(`/tasks?${search}`, { signal });
  },
  saveTask: (input: TaskInput, id?: string) =>
    request<Task>(id ? `/tasks/${encodeURIComponent(id)}` : '/tasks', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(input),
    }),
  deleteTask: (id: string) =>
    request<void>(`/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  tags: (signal?: AbortSignal) => request<Tag[]>('/tags', { signal }),
  saveTag: (input: Pick<Tag, 'name' | 'color'>, id?: string) =>
    request<Tag>(id ? `/tags/${encodeURIComponent(id)}` : '/tags', {
      method: id ? 'PUT' : 'POST',
      body: JSON.stringify(input),
    }),
  deleteTag: (id: string) => request<void>(`/tags/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  holidays: (year: number, signal?: AbortSignal) =>
    request<Holiday[]>(`/holidays/${year}`, { signal }),
};

export function errorMessage(error: unknown): string {
  if (error instanceof TypeError)
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  return error instanceof Error ? error.message : 'Ocorreu um erro inesperado. Tente novamente.';
}
