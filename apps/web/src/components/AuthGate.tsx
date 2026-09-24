import { useEffect, useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { CalendarDays, Check, LoaderCircle, LogOut, ShieldCheck } from 'lucide-react';
import App from '../App';
import { auth } from '../lib/firebase';
import { errorMessage } from '../lib/errors';

export function AuthGate() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
  const [error, setError] = useState('');
  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(
      auth,
      (next) => {
        setUser(next);
        setLoading(false);
      },
      (reason) => {
        setError(errorMessage(reason));
        setLoading(false);
      },
    );
  }, []);
  if (loading)
    return (
      <main className="auth-loading" role="status">
        <LoaderCircle className="spin" /> Preparando seu calendário…
      </main>
    );
  if (!user) return <LoginScreen initialError={error} />;
  return (
    <>
      <div className="account-bar">
        <span>
          <ShieldCheck size={15} />
          <strong>{user.displayName || user.email || 'Minha conta'}</strong>
          <span className="account-caption">Calendário pessoal</span>
        </span>
        <button
          className="text-button"
          onClick={() => {
            if (auth) void signOut(auth).catch((reason: unknown) => setError(errorMessage(reason)));
          }}
        >
          <LogOut size={15} /> Sair
        </button>
      </div>
      {error && (
        <div role="alert" className="notice warning">
          {error}
        </div>
      )}
      <App key={user.uid} />
    </>
  );
}

function LoginScreen({ initialError }: { initialError: string }) {
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [notice, setNotice] = useState('');
  const title =
    mode === 'register'
      ? 'Comece a se organizar.'
      : mode === 'reset'
        ? 'Recupere seu acesso.'
        : 'Bom ter você por aqui.';
  function switchMode(next: typeof mode) {
    setMode(next);
    setError('');
    setNotice('');
    setPassword('');
    setConfirmPassword('');
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || busy) return;
    if (mode === 'register' && password !== confirmPassword) {
      setError('As senhas precisam ser iguais.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(auth, email.trim());
        setNotice(
          'Se houver uma conta para este e-mail, você receberá as instruções de recuperação. Confira também o spam.',
        );
      } else if (mode === 'register')
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  async function google() {
    if (!auth || busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Seu calendário pessoal">
        <a className="brand" href="./" aria-label="Diel, página inicial">
          <span className="brand-mark">
            d<span>•</span>
          </span>
          <span>diel.</span>
        </a>
        <div className="auth-story-content">
          <div className="auth-kicker">TEMPO BEM VIVIDO</div>
          <h1>
            Mais clareza.
            <br />
            Mais espaço
            <br />
            para <em>acontecer.</em>
          </h1>
          <p>
            Suas tarefas, seus planos e um dia de cada vez. Organize o que importa em um só lugar.
          </p>
          <div className="auth-preview" aria-hidden="true">
            <span>
              <CalendarDays size={20} /> Seu dia, com propósito
            </span>
            <div>
              <i />
              <strong>Preparar apresentação</strong>
              <small>09:00 · Trabalho</small>
            </div>
            <div>
              <i />
              <strong>Um tempo para você</strong>
              <small>18:00 · Pessoal</small>
            </div>
            <footer>
              <Check size={15} /> Tudo no seu tempo.
            </footer>
          </div>
        </div>
        <span className="auth-story-footer">Planeje com calma. Faça com propósito.</span>
      </section>
      <section className="auth-form-section">
        <div className="auth-card">
          <span className="auth-kicker">SEU ESPAÇO PESSOAL</span>
          <h2>{title}</h2>
          <p>
            {mode === 'register'
              ? 'Crie sua conta e dê um lugar aos seus planos.'
              : mode === 'reset'
                ? 'Enviaremos um link para redefinir sua senha.'
                : 'Entre para acessar suas tarefas de onde estiver.'}
          </p>
          {!auth && (
            <div className="notice warning" role="alert">
              A conexão com o Firebase ainda está sendo configurada. O acesso ficará disponível após
              a ativação do projeto.
            </div>
          )}
          {mode !== 'reset' && (
            <>
              <button
                className="button google-button"
                disabled={busy || !auth}
                onClick={() => void google()}
              >
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.96c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
                  />
                </svg>
                Continuar com o Google
              </button>
              <div className="auth-divider">
                <span>ou use seu e-mail</span>
              </div>
            </>
          )}
          <form onSubmit={(event) => void submit(event)}>
            <label htmlFor="auth-email">E-mail</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              required
              maxLength={254}
              disabled={busy}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            {mode !== 'reset' && (
              <>
                <label htmlFor="auth-password">Senha</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  placeholder={mode === 'register' ? 'Pelo menos 8 caracteres' : 'Sua senha'}
                  required
                  minLength={mode === 'register' ? 8 : 1}
                  maxLength={128}
                  disabled={busy}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </>
            )}
            {mode === 'register' && (
              <>
                <label htmlFor="auth-confirm">Confirmar senha</label>
                <input
                  id="auth-confirm"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  disabled={busy}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </>
            )}
            {mode === 'login' && (
              <button
                className="text-button forgot-password"
                type="button"
                disabled={busy}
                onClick={() => switchMode('reset')}
              >
                Esqueci minha senha
              </button>
            )}
            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="auth-success" role="status">
                {notice}
              </p>
            )}
            <button className="button primary auth-submit" disabled={busy || !auth}>
              {busy ? (
                <>
                  <LoaderCircle size={18} className="spin" /> Aguarde…
                </>
              ) : mode === 'register' ? (
                'Criar minha conta'
              ) : mode === 'reset' ? (
                'Enviar link de recuperação'
              ) : (
                'Entrar no meu calendário'
              )}
            </button>
          </form>
          <div className="auth-switch">
            {mode === 'login' ? (
              <>
                Ainda não tem conta?{' '}
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() => switchMode('register')}
                >
                  Criar conta
                </button>
              </>
            ) : (
              <button className="text-button" disabled={busy} onClick={() => switchMode('login')}>
                Voltar para o login
              </button>
            )}
          </div>
          <p className="auth-privacy">
            <ShieldCheck size={16} /> Cada conta tem seu próprio calendário.
          </p>
        </div>
      </section>
    </main>
  );
}
