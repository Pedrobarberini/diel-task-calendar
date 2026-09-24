import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  confirmPasswordReset,
} from 'firebase/auth';
let app;
let auth;
before(() => {
  // Never use a production project or real Google credentials in this suite.
  app = initializeApp({ apiKey: 'demo-key', projectId: 'demo-diel-calendar' }, 'auth-tests');
  auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
});
after(async () => {
  await signOut(auth);
  await deleteApp(app);
});
test('email registration, rejected wrong password, login and logout', async () => {
  const email = 'email-flow@example.test';
  const result = await createUserWithEmailAndPassword(auth, email, 'Emulator-only-123');
  const uid = result.user.uid;
  await signOut(auth);
  assert.equal(auth.currentUser, null);
  await assert.rejects(signInWithEmailAndPassword(auth, email, 'wrong-password'));
  const logged = await signInWithEmailAndPassword(auth, email, 'Emulator-only-123');
  assert.equal(logged.user.uid, uid);
  await signOut(auth);
});
test('password recovery issues a local code and accepts the new password', async () => {
  const email = 'reset-flow@example.test';
  await createUserWithEmailAndPassword(auth, email, 'Emulator-before-123');
  await signOut(auth);
  await sendPasswordResetEmail(auth, email);
  const response = await fetch(
    'http://127.0.0.1:9099/emulator/v1/projects/demo-diel-calendar/oobCodes',
  );
  assert.equal(response.status, 200);
  const { oobCodes } = await response.json();
  const code = oobCodes.find(
    (item) => item.email === email && item.requestType === 'PASSWORD_RESET',
  );
  assert.ok(code);
  await confirmPasswordReset(auth, code.oobCode, 'Emulator-after-123');
  await assert.rejects(signInWithEmailAndPassword(auth, email, 'Emulator-before-123'));
  await signInWithEmailAndPassword(auth, email, 'Emulator-after-123');
  assert.equal(auth.currentUser.email, email);
  await signOut(auth);
});
test('emulated Google identity keeps the same account on subsequent login', async () => {
  // The official Auth emulator accepts mock JSON credentials; production rejects them.
  const credential = GoogleAuthProvider.credential(
    JSON.stringify({
      sub: 'google-demo-user',
      email: 'google-flow@example.test',
      email_verified: true,
    }),
  );
  const first = await signInWithCredential(auth, credential);
  assert.equal(first.user.providerData[0].providerId, 'google.com');
  const uid = first.user.uid;
  await signOut(auth);
  const second = await signInWithCredential(auth, credential);
  assert.equal(second.user.uid, uid);
});
