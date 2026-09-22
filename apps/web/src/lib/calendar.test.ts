import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  addDays,
  addMonthsClamped,
  calendarHeading,
  dateKey,
  durationLabel,
  localDateTimeToIso,
  monthDays,
  parseDateKey,
  startOfWeek,
  tasksForDay,
  visibleDays,
  visibleRange,
} from './calendar';

function taskAt(start: Date, durationMinutes: number, title = 'Tarefa'): Task {
  return {
    id: title,
    title,
    description: '',
    startsAt: start.toISOString(),
    durationMinutes,
    tags: [],
    createdAt: start.toISOString(),
    updatedAt: start.toISOString(),
  };
}

describe('calendar periods', () => {
  it('clamps January 31 to the last day of February in normal and leap years', () => {
    expect(dateKey(addMonthsClamped(new Date(2026, 0, 31), 1))).toBe('2026-02-28');
    expect(dateKey(addMonthsClamped(new Date(2024, 0, 31), 1))).toBe('2024-02-29');
    expect(dateKey(addMonthsClamped(new Date(2026, 2, 31), -1))).toBe('2026-02-28');
  });

  it('starts the week on Sunday, including when the selected date is Sunday', () => {
    expect(dateKey(startOfWeek(new Date(2026, 8, 22, 15)))).toBe('2026-09-20');
    expect(dateKey(startOfWeek(new Date(2026, 8, 20, 15)))).toBe('2026-09-20');
  });

  it('renders 42 distinct consecutive month cells, including adjacent months', () => {
    const days = monthDays(new Date(2026, 8, 22));
    expect(days).toHaveLength(42);
    expect(days[0].getDay()).toBe(0);
    expect(dateKey(days[0])).toBe('2026-08-30');
    expect(dateKey(days[41])).toBe('2026-10-10');
    expect(new Set(days.map(dateKey)).size).toBe(42);
  });

  it('uses one day or seven days according to the selected view', () => {
    const date = new Date(2026, 8, 22, 16, 30);
    expect(visibleDays(date, 'day')).toHaveLength(1);
    expect(visibleDays(date, 'day')[0].getHours()).toBe(0);
    expect(visibleDays(date, 'week')).toHaveLength(7);
  });

  it('queries the next midnight as an exclusive end instead of 23:59:59', () => {
    const date = new Date(2026, 8, 22, 12);
    const range = visibleRange(date, 'day');
    expect(range.from).toBe(new Date(2026, 8, 22).toISOString());
    expect(range.to).toBe(new Date(2026, 8, 23).toISOString());
  });

  it('requests holidays for both years in a month grid crossing New Year', () => {
    expect(visibleRange(new Date(2026, 0, 15), 'month').years).toEqual([2025, 2026]);
    expect(visibleRange(new Date(2026, 11, 31), 'week').years).toEqual([2026, 2027]);
  });

  it('does not mutate the selected date while calculating other periods', () => {
    const date = new Date(2026, 0, 31, 17, 45);
    const before = date.getTime();
    addDays(date, 4);
    addMonthsClamped(date, 1);
    startOfWeek(date);
    monthDays(date);
    expect(date.getTime()).toBe(before);
  });
});

describe('local dates and task overlaps', () => {
  it('keeps holiday date-only values on the requested local calendar date', () => {
    const date = parseDateKey('2026-09-07');
    expect(dateKey(date)).toBe('2026-09-07');
    expect(date.getHours()).toBe(0);
  });

  it('round-trips local form input through UTC without shifting its local time', () => {
    const iso = localDateTimeToIso('2026-09-22', '23:30');
    const restored = new Date(iso);
    expect(dateKey(restored)).toBe('2026-09-22');
    expect(restored.getHours()).toBe(23);
    expect(restored.getMinutes()).toBe(30);
    expect(iso.endsWith('Z')).toBe(true);
  });

  it('rejects dates and times that JavaScript would silently normalize', () => {
    expect(() => localDateTimeToIso('2026-02-30', '10:00')).toThrow();
    expect(() => localDateTimeToIso('2026-09-22', '24:00')).toThrow();
    expect(() => localDateTimeToIso('', '')).toThrow();
  });

  it('shows a task on both days when it crosses midnight', () => {
    const task = taskAt(new Date(2026, 8, 22, 23, 30), 120);
    expect(tasksForDay([task], new Date(2026, 8, 22))).toEqual([task]);
    expect(tasksForDay([task], new Date(2026, 8, 23))).toEqual([task]);
    expect(tasksForDay([task], new Date(2026, 8, 24))).toEqual([]);
  });

  it('excludes a task ending at midnight from the next day', () => {
    const task = taskAt(new Date(2026, 8, 22, 23), 60);
    expect(tasksForDay([task], new Date(2026, 8, 23))).toEqual([]);
  });

  it('excludes a task beginning at the next midnight from the previous day', () => {
    const task = taskAt(new Date(2026, 8, 23), 60);
    expect(tasksForDay([task], new Date(2026, 8, 22))).toEqual([]);
    expect(tasksForDay([task], new Date(2026, 8, 23))).toEqual([task]);
  });

  it('sorts by starting instant without changing the source array', () => {
    const afternoon = taskAt(new Date(2026, 8, 22, 15), 30, 'B');
    const morning = taskAt(new Date(2026, 8, 22, 9), 30, 'A');
    const tasks = [afternoon, morning];
    expect(tasksForDay(tasks, new Date(2026, 8, 22))).toEqual([morning, afternoon]);
    expect(tasks).toEqual([afternoon, morning]);
  });

  it('labels durations and a week spanning two years clearly', () => {
    expect(durationLabel(30)).toBe('30min');
    expect(durationLabel(60)).toBe('1h');
    expect(durationLabel(90)).toBe('1h 30min');
    const heading = calendarHeading(new Date(2026, 11, 31), 'week');
    expect(heading).toContain('2026');
    expect(heading).toContain('2027');
  });
});
