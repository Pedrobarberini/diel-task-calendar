import { z } from 'zod';

// Requiring an offset avoids interpreting a browser's local time as server time.
const instant = z.iso
  .datetime({ offset: true })
  .refine((value) => Number.isFinite(Date.parse(value)), 'Data inválida.')
  .transform((value) => new Date(value).toISOString());

export const idSchema = z.uuid();
export const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    description: z.string().trim().max(5000).default(''),
    startsAt: instant,
    durationMinutes: z.number().int().min(1).max(10080),
    tagIds: z
      .array(idSchema)
      .max(20)
      .default([])
      .refine(
        (ids) => new Set(ids).size === ids.length,
        'Não repita uma etiqueta na mesma tarefa.',
      ),
  })
  .strict();

export const tagSchema = z
  .object({
    name: z.string().trim().min(1).max(40),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor hexadecimal, como #2563eb.')
      .transform((color) => color.toLowerCase()),
  })
  .strict();

export const taskQuerySchema = z
  .object({
    from: instant.optional(),
    to: instant.optional(),
    q: z.string().trim().max(160).optional(),
    tagIds: z
      .string()
      .max(739)
      .optional()
      .transform((value) => (value ? value.split(',') : []))
      .pipe(z.array(idSchema).max(20))
      .transform((ids) => [...new Set(ids)]),
  })
  .strict()
  .refine((query) => !query.from || !query.to || query.from < query.to, {
    message: 'O fim do intervalo deve ser posterior ao início.',
    path: ['to'],
  });

export const yearSchema = z.coerce.number().int().min(1900).max(2100);

export type TaskInput = z.infer<typeof taskSchema>;
export type TagInput = z.infer<typeof tagSchema>;
export type TaskQuery = z.infer<typeof taskQuerySchema>;
