import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import {
  openDatabase,
  listTags,
  saveTag,
  deleteTag,
  listTasks,
  saveTask,
  deleteTask,
} from './database.js';
import { loadHolidays, type Holiday, type HolidayFetcher } from './holidays.js';
import { idSchema, tagSchema, taskQuerySchema, taskSchema, yearSchema } from './validation.js';

export interface AppOptions {
  databasePath?: string;
  webOrigin?: string;
  logger?: boolean;
  holidayFetcher?: HolidayFetcher;
}
const knownErrors: Record<string, { status: number; message: string }> = {
  TASK_NOT_FOUND: { status: 404, message: 'Tarefa não encontrada.' },
  TAG_NOT_FOUND: { status: 404, message: 'Etiqueta não encontrada.' },
  TAG_NAME_EXISTS: { status: 409, message: 'Já existe uma etiqueta com esse nome.' },
  UNKNOWN_TAG: { status: 400, message: 'Uma das etiquetas selecionadas não existe.' },
  HOLIDAYS_UNAVAILABLE: {
    status: 503,
    message:
      'Não foi possível carregar os feriados agora. Suas tarefas continuam disponíveis. Tente novamente em instantes.',
  },
};

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 64 * 1024 });
  const db = openDatabase(
    options.databasePath ?? process.env.DATABASE_PATH ?? './data/diel.sqlite',
  );
  const holidayCache = new Map<number, { expiresAt: number; data: Holiday[] }>();
  app.addHook('onClose', async () => db.close());
  await app.register(cors, {
    origin: options.webOrigin ?? process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  await app.register(helmet);

  app.setErrorHandler<Error & { statusCode?: number; details?: unknown }>(
    (error, request, reply) => {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Confira os dados informados.',
            details: error.issues.map((issue) => ({
              field: issue.path.join('.'),
              message: issue.message,
            })),
          },
        });
      }
      const known = knownErrors[error.message];
      if (known) {
        return reply.status(known.status).send({
          error: {
            code: error.message,
            message: known.message,
            ...(error.details ? { details: error.details } : {}),
          },
        });
      }
      const status = error.statusCode ?? 500;
      if (status >= 400 && status < 500) {
        return reply.status(status).send({
          error: {
            code: 'INVALID_REQUEST',
            message:
              status === 413
                ? 'O conteúdo enviado excede o limite permitido.'
                : 'Requisição inválida.',
          },
        });
      }
      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Ocorreu um erro inesperado. Tente novamente.',
        },
      });
    },
  );
  app.setNotFoundHandler((_request, reply) =>
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Endereço não encontrado.' } }),
  );

  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/tasks', async (request) => ({
    data: listTasks(db, taskQuerySchema.parse(request.query)),
  }));
  app.post('/api/tasks', async (request, reply) => {
    const task = saveTask(db, taskSchema.parse(request.body));
    return reply.status(201).send({ data: task });
  });
  app.put<{ Params: { id: string } }>('/api/tasks/:id', async (request) => ({
    data: saveTask(db, taskSchema.parse(request.body), idSchema.parse(request.params.id)),
  }));
  app.delete<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    deleteTask(db, idSchema.parse(request.params.id));
    return reply.status(204).send();
  });
  app.get('/api/tags', async () => ({ data: listTags(db) }));
  app.post('/api/tags', async (request, reply) => {
    const tag = saveTag(db, tagSchema.parse(request.body));
    return reply.status(201).send({ data: tag });
  });
  app.put<{ Params: { id: string } }>('/api/tags/:id', async (request) => ({
    data: saveTag(db, tagSchema.parse(request.body), idSchema.parse(request.params.id)),
  }));
  app.delete<{ Params: { id: string } }>('/api/tags/:id', async (request, reply) => {
    deleteTag(db, idSchema.parse(request.params.id));
    return reply.status(204).send();
  });
  app.get<{ Params: { year: string } }>('/api/holidays/:year', async (request) => {
    const year = yearSchema.parse(request.params.year);
    const cached = holidayCache.get(year);
    if (cached && cached.expiresAt > Date.now()) return { data: cached.data };
    const data = await loadHolidays(year, options.holidayFetcher);
    holidayCache.set(year, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, data });
    return { data };
  });
  await app.ready();
  return app;
}
