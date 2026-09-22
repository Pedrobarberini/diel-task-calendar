import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../lib/api';
import type { Holiday, Tag, Task } from '../types';

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useCalendarData(
  from: string,
  to: string,
  years: number[],
  query: string,
  tagIds: string[],
) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [holidayError, setHolidayError] = useState('');
  const [revision, setRevision] = useState(0);
  const debouncedQuery = useDebouncedValue(query, 300);
  const tagKey = [...tagIds].sort().join(',');
  const yearKey = years.join(',');
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([
      api.tasks(
        { from, to, q: debouncedQuery, tagIds: tagKey ? tagKey.split(',') : [] },
        controller.signal,
      ),
      api.tags(controller.signal),
    ])
      .then(([nextTasks, nextTags]) => {
        if (!controller.signal.aborted) {
          setTasks(nextTasks);
          setTags(nextTags);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(reason));
          setTasks([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, debouncedQuery, tagKey, revision]);

  useEffect(() => {
    const controller = new AbortController();
    setHolidayError('');
    setHolidays([]);
    Promise.allSettled(
      yearKey.split(',').map((year) => api.holidays(Number(year), controller.signal)),
    ).then((results) => {
      if (controller.signal.aborted) return;
      setHolidays(results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])));
      if (results.some((result) => result.status === 'rejected')) {
        setHolidayError(
          'Alguns feriados não puderam ser carregados. Suas tarefas continuam disponíveis.',
        );
      }
    });
    return () => controller.abort();
  }, [yearKey, revision]);

  return { tasks, tags, holidays, loading, error, holidayError, refresh };
}
