import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-diel-calendar',
    firestore: {
      rules: await readFile(new URL('../../../firestore.rules', import.meta.url), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});
after(async () => {
  await env?.cleanup();
});
const task = () => ({
  title: 'Reunião',
  description: '',
  startsAt: Timestamp.fromDate(new Date('2026-09-23T12:00:00Z')),
  durationMinutes: 60,
  tagIds: [],
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
test('owner can create read update and delete a task', async () => {
  const db = env.authenticatedContext('alice').firestore();
  const ref = doc(db, 'users/alice/tasks/valid');
  await assertSucceeds(setDoc(ref, task()));
  await assertSucceeds(getDoc(ref));
  await assertSucceeds(getDocs(collection(db, 'users/alice/tasks')));
  await assertSucceeds(updateDoc(ref, { title: 'Atualizada', updatedAt: serverTimestamp() }));
  await assertSucceeds(deleteDoc(ref));
});
test('unauthenticated users and other accounts cannot read or write any private collection', async () => {
  for (const db of [
    env.unauthenticatedContext().firestore(),
    env.authenticatedContext('bob').firestore(),
  ]) {
    for (const name of ['tasks', 'tags', 'tagNames']) {
      const ref = doc(db, `users/alice/${name}/blocked`);
      await assertFails(getDoc(ref));
      await assertFails(getDocs(collection(db, `users/alice/${name}`)));
      await assertFails(setDoc(ref, task()));
      await assertFails(deleteDoc(ref));
    }
  }
});
test('rules reject invalid data, extra fields and forged timestamps', async () => {
  const db = env.authenticatedContext('alice').firestore();
  const ref = doc(db, 'users/alice/tasks/invalid');
  for (const patch of [
    { title: '' },
    { durationMinutes: 0 },
    { durationMinutes: 10081 },
    { durationMinutes: 1.2 },
    { startsAt: 'invalid' },
    { tagIds: Array(21).fill('a') },
    { tagIds: ['a', 'a'] },
    { owner: 'bob' },
    { createdAt: Timestamp.fromMillis(0) },
    { updatedAt: Timestamp.fromMillis(0) },
  ])
    await assertFails(setDoc(ref, { ...task(), ...patch }));
});
test('createdAt cannot change on update', async () => {
  const ref = doc(env.authenticatedContext('alice').firestore(), 'users/alice/tasks/immutable');
  await assertSucceeds(setDoc(ref, task()));
  await assertFails(
    updateDoc(ref, { createdAt: Timestamp.fromMillis(0), updatedAt: serverTimestamp() }),
  );
});
test('tag fields and private name index are validated', async () => {
  const db = env.authenticatedContext('alice').firestore();
  const ref = doc(db, 'users/alice/tags/tag');
  const tag = { name: 'Trabalho', color: '#123abc', nameKey: 'a'.repeat(64) };
  await assertSucceeds(setDoc(ref, tag));
  await assertFails(setDoc(ref, { ...tag, color: 'red' }));
  await assertFails(setDoc(ref, { ...tag, name: 'x'.repeat(41) }));
  await assertFails(setDoc(ref, { ...tag, extra: true }));
  await assertSucceeds(setDoc(doc(db, 'users/alice/tagNames/' + 'a'.repeat(64)), { tagId: 'tag' }));
  await assertFails(setDoc(doc(db, 'users/alice/tagNames/bad'), { tagId: 42 }));
  await assertFails(setDoc(doc(db, 'anything/else'), { value: true }));
});
