import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronRight,
  FilterX,
  LoaderCircle,
  Menu,
  Plus,
  RefreshCw,
  Sun,
  X,
} from 'lucide-react';
import { CalendarGrid } from './components/CalendarGrid';
import { CalendarToolbar } from './components/CalendarToolbar';
import { Sidebar } from './components/Sidebar';
import { TagsDialog } from './components/TagsDialog';
import { TaskDialog } from './components/TaskDialog';
import { useCalendarData } from './hooks/useCalendarData';
import { addDays, addMonthsClamped, visibleRange } from './lib/calendar';
import type { CalendarView, Task } from './types';

export default function App() {
  const [date, setDate] = useState(() => new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [taskDialog, setTaskDialog] = useState<{ day: Date; task?: Task }>();
  const [tagsDialog, setTagsDialog] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [toast, setToast] = useState('');
  const range = useMemo(() => visibleRange(date, view), [date, view]);
  const data = useCalendarData(range.from, range.to, range.years, query, selectedTags);
  const hasFilters = Boolean(query.trim() || selectedTags.length);
  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function move(direction: number) {
    setDate((current) =>
      view === 'month'
        ? addMonthsClamped(current, direction)
        : addDays(current, direction * (view === 'week' ? 7 : 1)),
    );
  }
  function create(day = date) {
    setTaskDialog({ day });
    setMobileMenu(false);
  }
  function toggleTag(id: string) {
    setSelectedTags((current) =>
      current.includes(id) ? current.filter((tag) => tag !== id) : [...current, id],
    );
  }
  function saved(message: string) {
    setTaskDialog(undefined);
    setToast(message);
    data.refresh();
  }

  return (
    <div className="app-shell">
      <Sidebar
        date={date}
        tags={data.tags}
        selectedTags={selectedTags}
        onDate={setDate}
        onToggleTag={toggleTag}
        onClearTags={() => setSelectedTags([])}
        onCreate={() => create()}
        onManageTags={() => {
          setTagsDialog(true);
          setMobileMenu(false);
        }}
        mobileOpen={mobileMenu}
        onMobileClose={() => setMobileMenu(false)}
      />
      <main className="main-content">
        <div className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Abrir menu e filtros"
            >
              <Menu size={21} />
            </button>
            <span>Meu espaço</span>
            <ChevronRight size={13} />
            <strong>Calendário</strong>
          </div>
          <span className="topbar-date">
            <span className="connection-dot" />
            {todayLabel}
          </span>
        </div>
        <div className="page-heading">
          <div>
            <div className="eyebrow">
              <span />
              TEMPO BEM VIVIDO
            </div>
            <h1>
              Seu tempo, bem organizado<span>.</span>
            </h1>
            <p>Uma visão clara das suas tarefas. Mais espaço para fazer acontecer.</p>
          </div>
          <button className="button primary header-new-task" onClick={() => create()}>
            <Plus size={18} />
            Nova tarefa
          </button>
        </div>
        <section className="calendar-panel" aria-label="Calendário de tarefas">
          <CalendarToolbar
            date={date}
            view={view}
            query={query}
            onQuery={setQuery}
            onView={setView}
            onMove={move}
            onToday={() => setDate(new Date())}
          />
          <div className="calendar-meta">
            <span className="calendar-meta-label">
              <CalendarDays size={14} />
              {data.loading
                ? 'Atualizando calendário…'
                : data.tasks.length +
                  (data.tasks.length === 1 ? ' tarefa no período' : ' tarefas no período')}
              {hasFilters && <span className="filtered-label">com filtros</span>}
            </span>
            <span className="holiday-legend">
              <Sun size={13} />
              Feriados nacionais
            </span>
          </div>
          {data.holidayError && (
            <div className="notice warning" role="status">
              <AlertCircle size={16} />
              <span>{data.holidayError}</span>
              <button className="text-button" onClick={data.refresh}>
                Tentar novamente
              </button>
            </div>
          )}
          {hasFilters && (
            <div className="filter-summary">
              <span>
                {query.trim() && (
                  <>
                    Busca: <strong>“{query.trim()}”</strong> ·{' '}
                  </>
                )}
                {selectedTags.length
                  ? selectedTags.length + ' tag(s) selecionada(s) · corresponde a qualquer tag'
                  : 'Busca por título'}
              </span>
              <button
                className="text-button"
                onClick={() => {
                  setQuery('');
                  setSelectedTags([]);
                }}
              >
                <FilterX size={14} />
                Limpar filtros
              </button>
            </div>
          )}
          {data.error ? (
            <div className="error-state" role="alert">
              <AlertCircle size={30} />
              <h3>Não conseguimos carregar seu calendário</h3>
              <p>{data.error}</p>
              <button className="button primary" onClick={data.refresh}>
                <RefreshCw size={16} />
                Tentar novamente
              </button>
            </div>
          ) : (
            <div
              className={'calendar-body' + (data.loading ? ' is-loading' : '')}
              aria-busy={data.loading}
            >
              {data.loading && (
                <div className="loading-indicator" role="status">
                  <LoaderCircle size={17} className="spin" />
                  Carregando tarefas
                </div>
              )}
              {!data.loading && data.tasks.length === 0 && view !== 'day' && (
                <div className="empty-notice">
                  <span>
                    {hasFilters
                      ? 'Nenhuma tarefa encontrada com estes filtros.'
                      : 'Seu calendário está pronto. Adicione a primeira tarefa deste período.'}
                  </span>
                  <button
                    className="text-button"
                    onClick={
                      hasFilters
                        ? () => {
                            setQuery('');
                            setSelectedTags([]);
                          }
                        : () => create()
                    }
                  >
                    {hasFilters ? 'Limpar filtros' : 'Criar tarefa'}
                    <Plus size={14} />
                  </button>
                </div>
              )}
              <CalendarGrid
                date={date}
                view={view}
                tasks={data.loading ? [] : data.tasks}
                holidays={data.holidays}
                onTask={(task) => setTaskDialog({ day: new Date(task.startsAt), task })}
                onCreate={create}
                onDay={(day) => {
                  setDate(day);
                  setView('day');
                }}
              />
            </div>
          )}
        </section>
        <footer className="page-footer">
          <span>
            <span className="connection-dot" />
            Planeje com calma. Faça com propósito.
          </span>
          <span>Horários no fuso do dispositivo · Brasil</span>
        </footer>
      </main>
      {taskDialog && (
        <TaskDialog
          task={taskDialog.task}
          day={taskDialog.day}
          tags={data.tags}
          onClose={() => setTaskDialog(undefined)}
          onSaved={saved}
        />
      )}
      {tagsDialog && (
        <TagsDialog
          tags={data.tags}
          onClose={() => setTagsDialog(false)}
          onChanged={() => {
            setSelectedTags([]);
            data.refresh();
          }}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={18} />
          <span>{toast}</span>
          <button
            className="icon-button small"
            onClick={() => setToast('')}
            aria-label="Fechar notificação"
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
