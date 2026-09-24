import type { Tag, TaskInput } from '../types';
export function validateTask(input: TaskInput): TaskInput {
  const title = input.title.trim();
  if (!title || title.length > 160) throw new Error('O título deve ter entre 1 e 160 caracteres.');
  if (input.description.length > 5000)
    throw new Error('A descrição deve ter no máximo 5.000 caracteres.');
  if (!Number.isFinite(Date.parse(input.startsAt))) throw new Error('Informe uma data válida.');
  if (
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 1 ||
    input.durationMinutes > 10080
  )
    throw new Error('A duração deve ser de 1 minuto a 7 dias.');
  if (
    input.tagIds.length > 20 ||
    new Set(input.tagIds).size !== input.tagIds.length ||
    input.tagIds.some((id) => !/^[\w-]+$/.test(id))
  )
    throw new Error('Selecione até 20 tags diferentes.');
  return { ...input, title, startsAt: new Date(input.startsAt).toISOString() };
}
export function validateTag(input: Pick<Tag, 'name' | 'color'>) {
  const name = input.name.trim();
  if (!name || name.length > 40) throw new Error('O nome da tag deve ter entre 1 e 40 caracteres.');
  if (!/^#[\da-f]{6}$/i.test(input.color)) throw new Error('Escolha uma cor válida.');
  return { name, color: input.color };
}
export function matchesTask(
  task: { title: string; startsAt: string; durationMinutes: number; tags: Tag[] },
  params: { from: string; to: string; q: string; tagIds: string[] },
) {
  const start = Date.parse(task.startsAt);
  return (
    start < Date.parse(params.to) &&
    start + task.durationMinutes * 60000 > Date.parse(params.from) &&
    task.title.toLocaleLowerCase('pt-BR').includes(params.q.trim().toLocaleLowerCase('pt-BR')) &&
    (!params.tagIds.length || task.tags.some((tag) => params.tagIds.includes(tag.id)))
  );
}
