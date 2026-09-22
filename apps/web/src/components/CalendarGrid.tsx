import { ArrowUpRight, Clock3, Plus, Sun } from 'lucide-react';
import {
  dateKey,
  durationLabel,
  isSameDay,
  tasksForDay,
  timeLabel,
  visibleDays,
  WEEKDAYS,
  WEEKDAYS_LONG,
} from '../lib/calendar';
import type { CalendarView, Holiday, Task } from '../types';

interface CalendarGridProps {
  date: Date;
  view: CalendarView;
  tasks: Task[];
  holidays: Holiday[];
  onTask: (task: Task) => void;
  onCreate: (date: Date) => void;
  onDay: (date: Date) => void;
}

function TaskCard({
  task,
  day,
  compact,
  onClick,
}: {
  task: Task;
  day: Date;
  compact?: boolean;
  onClick: () => void;
}) {
  const start = new Date(task.startsAt);
  const end = new Date(start.getTime() + task.durationMinutes * 60_000);
  const continues = !isSameDay(start, day);
  const accent = task.tags[0]?.color || '#3B806B';
  return (
    <button
      className={'task-card' + (compact ? ' compact' : '')}
      onClick={onClick}
      style={{ borderLeftColor: accent }}
      aria-label={task.title + ', ' + timeLabel(start) + ', ' + durationLabel(task.durationMinutes)}
    >
      <div className="task-card-top">
        <span className="task-time">
          {continues ? 'Em andamento' : timeLabel(start)}
          {!compact && !continues && (
            <span>
              {' '}
              – {timeLabel(end)}
              {!isSameDay(start, end) ? ' +' : ''}
            </span>
          )}
        </span>
        {!compact && <ArrowUpRight size={14} className="task-open-icon" />}
      </div>
      <strong>{task.title}</strong>
      {!compact && task.description && <p className="task-description">{task.description}</p>}
      {!compact && (
        <div className="task-card-bottom">
          <span className="task-duration">
            <Clock3 size={11} />
            {durationLabel(task.durationMinutes)}
          </span>
          <div className="task-tags">
            {task.tags.slice(0, 2).map((tag) => (
              <span key={tag.id} className="task-tag">
                <span className="tag-dot" style={{ background: tag.color }} />
                {tag.name}
              </span>
            ))}
            {task.tags.length > 2 && <span className="more-tags">+{task.tags.length - 2}</span>}
          </div>
        </div>
      )}
    </button>
  );
}

function HolidayLabel({ holidays }: { holidays: Holiday[] }) {
  return (
    <>
      {holidays.map((holiday) => (
        <div
          className="holiday-label"
          key={holiday.date + holiday.localName}
          title={holiday.localName}
        >
          <Sun size={12} />
          <span>{holiday.localName}</span>
        </div>
      ))}
    </>
  );
}

export function CalendarGrid({
  date,
  view,
  tasks,
  holidays,
  onTask,
  onCreate,
  onDay,
}: CalendarGridProps) {
  const days = visibleDays(date, view);
  const today = new Date();
  const getHolidays = (day: Date) => holidays.filter((holiday) => holiday.date === dateKey(day));
  if (view === 'month')
    return (
      <div className="month-calendar" aria-label="Visualização mensal">
        <div className="month-weekdays">
          {WEEKDAYS.map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div className="month-grid">
          {days.map((day) => {
            const dayTasks = tasksForDay(tasks, day);
            const dayHolidays = getHolidays(day);
            return (
              <section
                key={dateKey(day)}
                className={
                  'month-cell' +
                  (day.getMonth() !== date.getMonth() ? ' other-month' : '') +
                  (isSameDay(day, today) ? ' today-cell' : '') +
                  (dayHolidays.length ? ' holiday-cell' : '')
                }
                aria-label={day.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
              >
                <header>
                  <button
                    className={'date-number' + (isSameDay(day, today) ? ' is-today' : '')}
                    onClick={() => onDay(day)}
                    aria-label={'Ver dia ' + day.toLocaleDateString('pt-BR')}
                  >
                    {day.getDate()}
                  </button>
                  <button
                    className="day-add icon-button small"
                    onClick={() => onCreate(day)}
                    aria-label={'Criar tarefa em ' + day.toLocaleDateString('pt-BR')}
                  >
                    <Plus size={14} />
                  </button>
                </header>
                <HolidayLabel holidays={dayHolidays} />
                <div className="month-tasks">
                  {dayTasks.slice(0, 3).map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      day={day}
                      compact
                      onClick={() => onTask(task)}
                    />
                  ))}
                </div>
                {dayTasks.length > 3 && (
                  <button className="more-tasks" onClick={() => onDay(day)}>
                    +{dayTasks.length - 3} {dayTasks.length - 3 === 1 ? 'tarefa' : 'tarefas'}
                  </button>
                )}
              </section>
            );
          })}
        </div>
      </div>
    );

  if (view === 'day') {
    const dayTasks = tasksForDay(tasks, date);
    const dayHolidays = getHolidays(date);
    return (
      <section className="day-calendar" aria-label="Visualização diária">
        <header className="day-view-heading">
          <div>
            <span className="eyebrow">{WEEKDAYS_LONG[date.getDay()]}</span>
            <h3>Seu dia, com mais clareza.</h3>
          </div>
          <span className="day-task-count">
            {dayTasks.length} {dayTasks.length === 1 ? 'tarefa' : 'tarefas'}
          </span>
        </header>
        {!!dayHolidays.length && (
          <div className="day-holidays">
            <HolidayLabel holidays={dayHolidays} />
          </div>
        )}
        {dayTasks.length ? (
          <div className="day-timeline">
            {dayTasks.map((task) => (
              <div className="timeline-row" key={task.id}>
                <div className="timeline-time">
                  {isSameDay(new Date(task.startsAt), date) ? timeLabel(task.startsAt) : 'Antes'}
                  <span />
                </div>
                <TaskCard task={task} day={date} onClick={() => onTask(task)} />
              </div>
            ))}
          </div>
        ) : (
          <div className="day-empty">
            <div className="empty-illustration">
              <Sun size={32} />
            </div>
            <h3>Um dia cheio de possibilidades</h3>
            <p>Você ainda não tem tarefas para esta data.</p>
            <button className="button primary" onClick={() => onCreate(date)}>
              <Plus size={16} />
              Adicionar tarefa
            </button>
          </div>
        )}
      </section>
    );
  }

  return (
    <div className="week-scroll">
      <div className="week-calendar" aria-label="Visualização semanal">
        {days.map((day) => {
          const dayTasks = tasksForDay(tasks, day);
          const dayHolidays = getHolidays(day);
          return (
            <section
              key={dateKey(day)}
              className={'week-column' + (isSameDay(day, today) ? ' today-column' : '')}
            >
              <header className="week-day-heading">
                <span>{WEEKDAYS[day.getDay()]}</span>
                <button
                  className={'date-number' + (isSameDay(day, today) ? ' is-today' : '')}
                  onClick={() => onDay(day)}
                  aria-label={'Ver dia ' + day.toLocaleDateString('pt-BR')}
                >
                  {day.getDate()}
                </button>
                <span className="week-count">{dayTasks.length || '—'}</span>
              </header>
              <div className="week-holidays">
                <HolidayLabel holidays={dayHolidays} />
              </div>
              <div className="week-tasks">
                {dayTasks.map((task) => (
                  <TaskCard key={task.id} task={task} day={day} onClick={() => onTask(task)} />
                ))}
                <button
                  className="week-add"
                  onClick={() => onCreate(day)}
                  aria-label={'Criar tarefa em ' + day.toLocaleDateString('pt-BR')}
                >
                  <Plus size={15} />
                  <span>Adicionar</span>
                </button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
