import { api as restApi } from './rest-api';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Firestore,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { holidays } from './holidays';
import { matchesTask, validateTag, validateTask } from './cloud-domain';
import type { Tag, Task, TaskInput } from '../types';
export { errorMessage } from './errors';

function scope(): { store: Firestore; uid: string } {
  if (!db || !auth?.currentUser) throw new Error('Entre na sua conta para acessar o calendário.');
  return { store: db, uid: auth.currentUser.uid };
}
async function readTags(store: Firestore, uid: string): Promise<Tag[]> {
  const snapshot = await getDocs(collection(store, 'users', uid, 'tags'));
  return snapshot.docs
    .map((item) => ({
      id: item.id,
      name: String(item.data().name),
      color: String(item.data().color),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
async function nameKey(name: string) {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(name.toLocaleLowerCase('pt-BR')),
  );
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
const cloudApi = {
  async tasks(
    params: { from: string; to: string; q: string; tagIds: string[] },
    signal?: AbortSignal,
  ): Promise<Task[]> {
    signal?.throwIfAborted();
    const { store, uid } = scope();
    // A task lasts at most seven days, so this bounded query includes carry-over tasks.
    const [snapshot, tags] = await Promise.all([
      getDocs(
        query(
          collection(store, 'users', uid, 'tasks'),
          where('startsAt', '>=', Timestamp.fromMillis(Date.parse(params.from) - 7 * 86400000)),
          where('startsAt', '<', Timestamp.fromDate(new Date(params.to))),
        ),
      ),
      readTags(store, uid),
    ]);
    signal?.throwIfAborted();
    return snapshot.docs
      .map((item): Task => {
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
      })
      .filter((task) => matchesTask(task, params))
      .sort(
        (a, b) => a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title, 'pt-BR'),
      );
  },
  async tags(signal?: AbortSignal) {
    signal?.throwIfAborted();
    const { store, uid } = scope();
    const result = await readTags(store, uid);
    signal?.throwIfAborted();
    return result;
  },
  async saveTask(raw: TaskInput, id?: string) {
    const input = validateTask(raw);
    const { store, uid } = scope();
    const ref = doc(store, 'users', uid, 'tasks', id || crypto.randomUUID());
    const tags = await readTags(store, uid);
    if (input.tagIds.some((tagId) => !tags.some((tag) => tag.id === tagId)))
      throw new Error('Uma tag foi removida. Atualize o calendário e tente novamente.');
    if (id && !(await getDoc(ref)).exists())
      throw new Error('Esta tarefa foi removida. Atualize o calendário.');
    await setDoc(
      ref,
      {
        ...input,
        startsAt: Timestamp.fromDate(new Date(input.startsAt)),
        updatedAt: serverTimestamp(),
        ...(!id ? { createdAt: serverTimestamp() } : {}),
      },
      { merge: Boolean(id) },
    );
  },
  async deleteTask(id: string) {
    const { store, uid } = scope();
    await deleteDoc(doc(store, 'users', uid, 'tasks', id));
  },
  async saveTag(raw: Pick<Tag, 'name' | 'color'>, id?: string) {
    const input = validateTag(raw);
    const key = await nameKey(input.name);
    const { store, uid } = scope();
    const tagId = id || crypto.randomUUID();
    const ref = doc(store, 'users', uid, 'tags', tagId);
    const index = doc(store, 'users', uid, 'tagNames', key);
    await runTransaction(store, async (transaction) => {
      const [current, occupied] = await Promise.all([transaction.get(ref), transaction.get(index)]);
      if (id && !current.exists()) throw new Error('Esta tag foi removida. Atualize o calendário.');
      if (occupied.exists() && occupied.data().tagId !== tagId)
        throw new Error('Já existe uma tag com esse nome.');
      const oldKey = current.data()?.nameKey as string | undefined;
      if (oldKey && oldKey !== key)
        transaction.delete(doc(store, 'users', uid, 'tagNames', oldKey));
      transaction.set(index, { tagId });
      transaction.set(ref, { ...input, nameKey: key });
    });
    return { id: tagId, ...input };
  },
  async deleteTag(id: string) {
    const { store, uid } = scope();
    const ref = doc(store, 'users', uid, 'tags', id);
    await runTransaction(store, async (transaction) => {
      const current = await transaction.get(ref);
      if (!current.exists()) return;
      transaction.delete(doc(store, 'users', uid, 'tagNames', current.data().nameKey));
      transaction.delete(ref);
    });
    // Historical task IDs may remain, but hydration only displays existing tags.
  },
  holidays,
};

export const api = import.meta.env.VITE_DATA_MODE === 'rest' ? restApi : cloudApi;
