import { useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { errorMessage } from '../lib/errors';

type Mode = 'login' | 'register' | 'reset';

export function Login({ initialError }: { initialError: string }) {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const title =
    mode === 'register' ? 'Criar conta' : mode === 'reset' ? 'Recuperar senha' : 'Entrar';

  function changeMode(next: Mode) {
    setMode(next);
    setPassword('');
    setConfirmation('');
    setError('');
    setNotice('');
  }
  async function perform(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === 'register' && password !== confirmation) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    void perform(async () => {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice(
          'Se houver uma conta com este e-mail, você receberá as instruções para recuperar a senha.',
        );
      } else if (mode === 'register') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    });
  }
  function google() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    void perform(() => signInWithPopup(auth, provider));
  }

  return (
    <main className="login-card">
      <p className="brand">Diel</p>
      <h1>Calendário de tarefas</h1>
      <p>Acesse sua conta para organizar suas tarefas.</p>
      <h2>{title}</h2>
      {mode !== 'reset' && (
        <button className="google-button" disabled={busy} onClick={google}>
          Continuar com o Google
        </button>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          {mode !== 'reset' && (
            <label>
              Senha
              <input
                type="password"
                required
                minLength={mode === 'register' ? 8 : 1}
                maxLength={128}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
          )}
          {mode === 'register' && (
            <label>
              Confirmar senha
              <input
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </label>
          )}
          {mode === 'register' && <small>Use pelo menos 8 caracteres.</small>}
          <button className="primary" type="submit">
            {busy ? 'Aguarde…' : title}
          </button>
        </fieldset>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <div className="actions">
        {mode === 'login' ? (
          <>
            <button disabled={busy} onClick={() => changeMode('register')}>
              Criar conta
            </button>
            <button disabled={busy} onClick={() => changeMode('reset')}>
              Esqueci minha senha
            </button>
          </>
        ) : (
          <button disabled={busy} onClick={() => changeMode('login')}>
            Voltar para o login
          </button>
        )}
      </div>
    </main>
  );
}
