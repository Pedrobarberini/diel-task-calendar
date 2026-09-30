import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Holiday, Tag, Task, TaskInput } from '../types';

const useRest = import.meta.env.VITE_DATA_MODE === 'rest';
const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
const holidayCache = new Map<number, { data: Holiday[]; expires: number }>();

async function request(path: string, method = 'GET', body?: object): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(
      result?.error?.message || 'Não foi possível concluir a solicitação. Tente novamente.',
    );
  }
  if (response.status === 204) return;
  return (await response.json()).data;
}

function userId(): string {
  if (!auth.currentUser) throw new Error('Entre na sua conta para acessar o calendário.');
  return auth.currentUser.uid;
}

function validateTask(input: TaskInput): TaskInput {
  const title = input.title.trim();
  if (!title || title.length > 160) throw new Error('O título deve ter entre 1 e 160 caracteres.');
  if (input.description.length > 5000)
    throw new Error('A descrição deve ter no máximo 5.000 caracteres.');
  if (!Number.isFinite(Date.parse(input.startsAt))) throw new Error('Informe uma data válida.');
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 1 ||
    input.durationMinutes > 10080
  )
    throw new Error('A duração deve ser de 1 minuto a 7 dias.');
  if (
    input.tagIds.length > 20 ||
    new Set(input.tagIds).size !== input.tagIds.length ||
    input.tagIds.some((id) => !/^[\w-]+$/.test(id))
  )
    throw new Error('Selecione até 20 etiquetas diferentes.');
  return { ...input, title, startsAt: new Date(input.startsAt).toISOString() };
}

export const api = {
  async loadCalendar(): Promise<{ tasks: Task[]; tags: Tag[] }> {
    if (useRest) {
      const [tasks, tags] = await Promise.all([request('/tasks'), request('/tags')]);
      return { tasks: tasks as Task[], tags: tags as Tag[] };
    }
    const uid = userId();
    const [taskSnapshot, tagSnapshot] = await Promise.all([
      getDocs(collection(db, 'users', uid, 'tasks')),
      getDocs(collection(db, 'users', uid, 'tags')),
    ]);
    const tags: Tag[] = tagSnapshot.docs.map((item) => ({
      id: item.id,
      name: item.data().name,
      color: item.data().color,
    }));
    tags.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    const tasks: Task[] = taskSnapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        title: data.title,
        description: data.description,
        startsAt: (data.startsAt as Timestamp).toDate().toISOString(),
        durationMinutes: data.durationMinutes,
        tags: tags.filter((tag) => data.tagIds.includes(tag.id)),
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      };
    });
    tasks.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return { tasks, tags };
  },

  async saveTask(raw: TaskInput, id?: string): Promise<void> {
    const input = validateTask(raw);
    if (useRest) {
      await request(id ? `/tasks/${encodeURIComponent(id)}` : '/tasks', id ? 'PUT' : 'POST', input);
      return;
    }
    const ref = doc(db, 'users', userId(), 'tasks', id || crypto.randomUUID());
    const task = {
      ...input,
      startsAt: Timestamp.fromDate(new Date(input.startsAt)),
      updatedAt: serverTimestamp(),
    };
    if (id) await updateDoc(ref, task);
    else await setDoc(ref, { ...task, createdAt: serverTimestamp() });
  },

  async deleteTask(id: string): Promise<void> {
    if (useRest) await request(`/tasks/${encodeURIComponent(id)}`, 'DELETE');
    else await deleteDoc(doc(db, 'users', userId(), 'tasks', id));
  },

  async saveTag(input: Pick<Tag, 'name' | 'color'>, id?: string): Promise<Tag> {
    const name = input.name.trim();
    if (!name || name.length > 40)
      throw new Error('O nome da etiqueta deve ter entre 1 e 40 caracteres.');
    if (!/^#[\da-f]{6}$/i.test(input.color)) throw new Error('Escolha uma cor válida.');
    const tag = { name, color: input.color };
    if (useRest) {
      return (await request(
        id ? `/tags/${encodeURIComponent(id)}` : '/tags',
        id ? 'PUT' : 'POST',
        tag,
      )) as Tag;
    }
    const tagId = id || crypto.randomUUID();
    const ref = doc(db, 'users', userId(), 'tags', tagId);
    const hash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(name.toLocaleLowerCase('pt-BR')),
    );
    const nameKey = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, '0'),
    ).join('');
    if (id) await updateDoc(ref, { ...tag, nameKey });
    else await setDoc(ref, { ...tag, nameKey });
    return { id: tagId, ...tag };
  },

  async deleteTag(id: string): Promise<void> {
    if (useRest) await request(`/tags/${encodeURIComponent(id)}`, 'DELETE');
    else await deleteDoc(doc(db, 'users', userId(), 'tags', id));
  },

  async holidays(year: number): Promise<Holiday[]> {
    if (!Number.isInteger(year) || year < 1900 || year > 2100) throw new Error('Ano inválido.');
    if (useRest) return (await request(`/holidays/${year}`)) as Holiday[];
    const cached = holidayCache.get(year);
    if (cached && cached.expires > Date.now()) return cached.data;
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/BR`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Não foi possível carregar os feriados.');
    const body: unknown = await response.json();
    if (!Array.isArray(body)) throw new Error('Resposta inválida do serviço de feriados.');
    const holidays: Holiday[] = body
      .filter(
        (item) =>
          item &&
          typeof item.date === 'string' &&
          new RegExp(`^${year}-\\d{2}-\\d{2}$`).test(item.date) &&
          typeof item.localName === 'string' &&
          typeof item.name === 'string' &&
          item.countryCode === 'BR' &&
          item.global === true &&
          Array.isArray(item.types) &&
          item.types.includes('Public'),
      )
      .map(({ date, localName, name }) => ({
        date,
        localName,
        name,
        countryCode: 'BR',
        global: true,
      }));
    holidayCache.set(year, { data: holidays, expires: Date.now() + 86400000 });
    return holidays;
  },
};
