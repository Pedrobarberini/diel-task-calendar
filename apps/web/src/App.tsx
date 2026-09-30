import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { Calendar } from './components/Calendar';
import { Login } from './components/Login';
import { TaskForm } from './components/TaskForm';
import { TagsForm } from './components/TagsForm';
import { api } from './lib/api';
import { auth } from './lib/firebase';
import { errorMessage } from './lib/errors';
import { visibleRange } from './lib/calendar';
import type { CalendarView, Holiday, Tag, Task } from './types';

const localMode = import.meta.env.VITE_DATA_MODE === 'rest';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(localMode);
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<{ day: Date; task?: Task } | null>(null);
  const [showTags, setShowTags] = useState(false);
  const years = visibleRange(date, view).years.join(',');
  const canLoad = ready && (localMode || Boolean(user));
  const refresh = () => setRevision((current) => current + 1);

  useEffect(() => {
    if (localMode) return;
    return onAuthStateChanged(
      auth,
      (next) => {
        setUser(next);
        setReady(true);
        setTasks([]);
        setTags([]);
        setEditor(null);
        setShowTags(false);
        setError('');
      },
      (reason) => {
        setError(errorMessage(reason));
        setReady(true);
      },
    );
  }, []);

  useEffect(() => {
    if (!canLoad) return;
    let active = true;
    setLoading(true);
    setError('');
    api
      .loadCalendar()
      .then((data) => {
        if (active) {
          setTasks(data.tasks);
          setTags(data.tags);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(errorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canLoad, user?.uid, revision]);

  useEffect(() => {
    if (!canLoad) return;
    let active = true;
    setHolidays([]);
    setHolidayError('');
    Promise.allSettled(years.split(',').map((year) => api.holidays(Number(year)))).then(
      (results) => {
        if (!active) return;
        setHolidays(
          results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
        );
        if (results.some((result) => result.status === 'rejected')) {
          setHolidayError(
            'Não foi possível carregar todos os feriados. Suas tarefas continuam disponíveis.',
          );
        }
      },
    );
    return () => {
      active = false;
    };
  }, [canLoad, years, revision]);

  if (!ready)
    return (
      <main className="login-card">
        <p role="status">Carregando sua conta…</p>
      </main>
    );
  if (!localMode && !user) return <Login initialError={error} />;

  return (
    <main className="app">
      <header className="app-header">
        <div>
          <h1>Calendário de tarefas</h1>
          <p>Diel · Organize seu dia, sua semana e seu mês.</p>
        </div>
        {user && (
          <div className="account">
            <span>{user.displayName || user.email}</span>
            <button
              onClick={() =>
                void signOut(auth).catch((reason: unknown) => setError(errorMessage(reason)))
              }
            >
              Sair
            </button>
          </div>
        )}
      </header>
      <div className="actions">
        <button
          className="primary"
          onClick={() => {
            setEditor({ day: date });
            setShowTags(false);
          }}
        >
          Nova tarefa
        </button>
        <button
          onClick={() => {
            setShowTags(!showTags);
            setEditor(null);
          }}
        >
          Gerenciar tags
        </button>
        <button disabled={loading} onClick={refresh}>
          Atualizar
        </button>
        {loading && <span role="status">Carregando tarefas…</span>}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {holidayError && (
        <p className="warning" role="status">
          {holidayError}
        </p>
      )}
      {editor && (
        <TaskForm
          key={editor.task?.id || editor.day.toISOString()}
          task={editor.task}
          day={editor.day}
          tags={tags}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            refresh();
          }}
        />
      )}
      {showTags && <TagsForm tags={tags} onClose={() => setShowTags(false)} onChanged={refresh} />}
      <Calendar
        key={user?.uid || 'local'}
        date={date}
        view={view}
        tasks={tasks}
        tags={tags}
        holidays={holidays}
        onDate={setDate}
        onView={setView}
        onEdit={(task) => {
          setEditor({ day: new Date(task.startsAt), task });
          setShowTags(false);
        }}
        onCreate={(day) => {
          setEditor({ day });
          setShowTags(false);
        }}
      />
      <footer className="app-footer">
        Horários no fuso do seu dispositivo · Feriados nacionais do Brasil
      </footer>
    </main>
  );
}
