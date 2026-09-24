import { describe, expect, it } from 'vitest';
import { matchesTask, validateTag, validateTask } from './cloud-domain';
const input = {
  title: ' Reunião ',
  description: '',
  startsAt: '2026-09-23T09:00:00-03:00',
  durationMinutes: 60,
  tagIds: [],
};
describe('cloud data validation', () => {
  it('normalizes titles and dates', () => {
    expect(validateTask(input)).toMatchObject({
      title: 'Reunião',
      startsAt: '2026-09-23T12:00:00.000Z',
    });
  });
  it.each([0, -1, 1.5, 10081])('rejects invalid duration %s', (durationMinutes) => {
    expect(() => validateTask({ ...input, durationMinutes })).toThrow();
  });
  it('rejects empty titles, invalid dates and duplicate tags', () => {
    expect(() => validateTask({ ...input, title: ' ' })).toThrow();
    expect(() => validateTask({ ...input, startsAt: 'invalid' })).toThrow();
    expect(() => validateTask({ ...input, tagIds: ['a', 'a'] })).toThrow();
  });
  it('validates and trims tag names', () => {
    expect(validateTag({ name: ' Trabalho ', color: '#123abc' }).name).toBe('Trabalho');
    expect(() => validateTag({ name: '', color: 'red' })).toThrow();
  });
  it('includes a task that carries over midnight and combines search with tags', () => {
    const task = {
      title: 'Reunião técnica',
      startsAt: '2026-09-22T23:30:00Z',
      durationMinutes: 90,
      tags: [{ id: 'a', name: 'Trabalho', color: '#123abc' }],
    };
    const params = {
      from: '2026-09-23T00:00:00Z',
      to: '2026-09-24T00:00:00Z',
      q: 'REUNIÃO',
      tagIds: ['a', 'b'],
    };
    expect(matchesTask(task, params)).toBe(true);
    expect(matchesTask(task, { ...params, tagIds: ['b'] })).toBe(false);
    expect(matchesTask(task, { ...params, from: '2026-09-23T01:00:00Z' })).toBe(false);
  });
});
