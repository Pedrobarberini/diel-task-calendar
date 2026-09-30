import { useState } from 'react';
import {
  addDays,
  addMonthsClamped,
  calendarHeading,
  dateKey,
  durationLabel,
  isSameDay,
  parseDateKey,
  tasksForDay,
  timeLabel,
  visibleDays,
  WEEKDAYS,
} from '../lib/calendar';
import type { CalendarView, Holiday, Tag, Task } from '../types';

interface Props {
  date: Date;
  view: CalendarView;
  tasks: Task[];
  tags: Tag[];
  holidays: Holiday[];
  onDate: (date: Date) => void;
  onView: (view: CalendarView) => void;
  onEdit: (task: Task) => void;
  onCreate: (date: Date) => void;
}

export function Calendar({
  date,
  view,
  tasks,
  tags,
  holidays,
  onDate,
  onView,
  onEdit,
  onCreate,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const activeTags = selectedTags.filter((id) => tags.some((tag) => tag.id === id));
  const filtered = tasks.filter(
    (task) =>
      task.title.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')) &&
      (!activeTags.length || task.tags.some((tag) => activeTags.includes(tag.id))),
  );
  const days = visibleDays(date, view);
  function move(direction: number) {
    onDate(
      view === 'month'
        ? addMonthsClamped(date, direction)
        : addDays(date, direction * (view === 'week' ? 7 : 1)),
    );
  }

  return (
    <section className="calendar-panel" aria-label="Calendário">
      <div className="calendar-toolbar">
        <div className="actions">
          <button onClick={() => move(-1)} aria-label="Período anterior">
            ←
          </button>
          <button onClick={() => onDate(new Date())}>Hoje</button>
          <button onClick={() => move(1)} aria-label="Próximo período">
            →
          </button>
        </div>
        <h2>{calendarHeading(date, view)}</h2>
        <label>
          Visualização
          <select value={view} onChange={(event) => onView(event.target.value as CalendarView)}>
            <option value="month">Mês</option>
            <option value="week">Semana</option>
            <option value="day">Dia</option>
          </select>
        </label>
      </div>
      <div className="filters">
        <label>
          Buscar pelo título
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: reunião"
          />
        </label>
        <label>
          Ir para uma data
          <input
            type="date"
            value={dateKey(date)}
            onChange={(event) => {
              if (event.target.value) onDate(parseDateKey(event.target.value));
            }}
          />
        </label>
        {(query || activeTags.length > 0) && (
          <button
            onClick={() => {
              setQuery('');
              setSelectedTags([]);
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>
      {tags.length > 0 && (
        <fieldset className="tag-filters">
          <legend>Filtrar por tags · corresponde a qualquer tag selecionada</legend>
          <div className="tag-options">
            {tags.map((tag) => (
              <label className="tag-choice" key={tag.id}>
                <input
                  type="checkbox"
                  checked={activeTags.includes(tag.id)}
                  onChange={(event) =>
                    setSelectedTags(
                      event.target.checked
                        ? [...activeTags, tag.id]
                        : activeTags.filter((id) => id !== tag.id),
                    )
                  }
                />
                <span className="tag-dot" style={{ backgroundColor: tag.color }} />
                {tag.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="calendar-scroll">
        {view === 'month' && (
          <div className="weekdays">
            {WEEKDAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        )}
        <div className={'calendar-grid ' + view}>
          {days.map((day) => {
            const dayTasks = tasksForDay(filtered, day);
            const shown = view === 'month' ? dayTasks.slice(0, 3) : dayTasks;
            return (
              <section
                key={dateKey(day)}
                className={
                  'calendar-day' +
                  (view === 'month' && day.getMonth() !== date.getMonth() ? ' outside-month' : '')
                }
                aria-label={day.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
              >
                <header className="day-header">
                  <button
                    className={isSameDay(day, new Date()) ? 'today' : ''}
                    aria-current={isSameDay(day, new Date()) ? 'date' : undefined}
                    onClick={() => {
                      onDate(day);
                      onView('day');
                    }}
                    aria-label={'Ver dia ' + day.toLocaleDateString('pt-BR')}
                  >
                    {view !== 'month' && WEEKDAYS[day.getDay()] + ' '}
                    {day.getDate()}
                  </button>
                  <button
                    onClick={() => onCreate(day)}
                    aria-label={'Criar tarefa em ' + day.toLocaleDateString('pt-BR')}
                  >
                    +
                  </button>
                </header>
                {holidays
                  .filter((holiday) => holiday.date === dateKey(day))
                  .map((holiday) => (
                    <p className="holiday" key={holiday.date + holiday.localName}>
                      {holiday.localName}
                    </p>
                  ))}
                {shown.map((task) => (
                  <button
                    className="task"
                    key={task.id}
                    style={{ borderLeftColor: task.tags[0]?.color || '#25634a' }}
                    onClick={() => onEdit(task)}
                  >
                    <small>
                      {isSameDay(new Date(task.startsAt), day)
                        ? timeLabel(task.startsAt)
                        : 'Em andamento'}{' '}
                      · {durationLabel(task.durationMinutes)}
                    </small>
                    <strong>{task.title}</strong>
                    {view !== 'month' && (
                      <>
                        {task.description && <p>{task.description}</p>}
                        <span className="task-tags">
                          {task.tags.map((tag) => (
                            <span key={tag.id}>
                              <i className="tag-dot" style={{ backgroundColor: tag.color }} />
                              {tag.name}
                            </span>
                          ))}
                        </span>
                      </>
                    )}
                  </button>
                ))}
                {dayTasks.length > shown.length && (
                  <button
                    className="more-tasks"
                    onClick={() => {
                      onDate(day);
                      onView('day');
                    }}
                  >
                    +{dayTasks.length - shown.length} tarefas
                  </button>
                )}
                {view !== 'month' && !dayTasks.length && (
                  <p className="empty">Nenhuma tarefa neste dia.</p>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
