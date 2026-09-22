import type { CalendarView, Task } from '../types';

export const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const WEEKDAYS_LONG = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + amount);
  return result;
}

/** Keep January 31 -> February 28/29, instead of overflowing into March. */
export function addMonthsClamped(date: Date, amount: number): Date {
  const result = new Date(date);
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + amount);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function startOfWeek(date: Date): Date {
  return addDays(startOfDay(date), -date.getDay());
}

export function dateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Date-only holiday values are local calendar dates, never UTC instants. */
export function parseDateKey(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isSameDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

export function monthDays(date: Date): Date[] {
  const firstDay = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  return Array.from({ length: 42 }, (_, index) => addDays(firstDay, index));
}

export function visibleDays(date: Date, view: CalendarView): Date[] {
  if (view === 'month') return monthDays(date);
  if (view === 'day') return [startOfDay(date)];
  const first = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(first, index));
}

/** The visible interval is half-open: [from, to). */
export function visibleRange(
  date: Date,
  view: CalendarView,
): { from: string; to: string; years: number[] } {
  const days = visibleDays(date, view);
  return {
    from: days[0].toISOString(),
    to: addDays(days[days.length - 1], 1).toISOString(),
    years: [...new Set(days.map((day) => day.getFullYear()))],
  };
}

export function tasksForDay(tasks: Task[], day: Date): Task[] {
  const from = startOfDay(day).getTime();
  const to = addDays(startOfDay(day), 1).getTime();
  return tasks
    .filter((task) => {
      const start = new Date(task.startsAt).getTime();
      const end = start + task.durationMinutes * 60_000;
      return start < to && end > from;
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt) || a.title.localeCompare(b.title));
}

export function timeLabel(date: Date | string): string {
  return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function durationLabel(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}min` : ''}` : `${rest}min`;
}

export function inputTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function localDateTimeToIso(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(year, month - 1, day, hours, minutes);
  if (dateKey(result) !== date || inputTime(result) !== time) {
    throw new Error('Informe uma data e um horário válidos.');
  }
  return result.toISOString();
}

export function calendarHeading(date: Date, view: CalendarView): string {
  if (view === 'day')
    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (view === 'month') return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const first = startOfWeek(date);
  const last = addDays(first, 6);
  if (first.getMonth() === last.getMonth()) {
    return `${first.getDate()} – ${last.getDate()} de ${last.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
  }
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const firstYear = first.getFullYear() !== last.getFullYear() ? ` ${first.getFullYear()}` : '';
  return `${first.toLocaleDateString('pt-BR', options)}${firstYear} – ${last.toLocaleDateString('pt-BR', options)} ${last.getFullYear()}`;
}
