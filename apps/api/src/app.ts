import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { ZodError } from 'zod';
import { openDatabase } from './database.js';
import { ApiError } from './errors.js';
import { HolidayService, type HolidayFetcher } from './holidays.js';
import { Repository } from './repository.js';
import { idSchema, tagSchema, taskQuerySchema, taskSchema, yearSchema } from './validation.js';

export interface AppOptions {
  databasePath?: string;
  webOrigin?: string;
  logger?: boolean;
  holidayFetcher?: HolidayFetcher;
  now?: () => number;
  holidayCacheTtlMs?: number;
}

export async function buildApp(options: AppOptions = {}) {
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 64 * 1024 });
  const db = openDatabase(
    options.databasePath ?? process.env.DATABASE_PATH ?? './data/diel.sqlite',
  );
  const repository = new Repository(db);
  const holidays = new HolidayService(
    options.holidayFetcher,
    options.now,
    options.holidayCacheTtlMs,
  );
  app.addHook('onClose', async () => {
    db.close();
  });

  await app.register(cors, {
    origin: options.webOrigin ?? process.env.WEB_ORIGIN ?? 'http://127.0.0.1:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });
  await app.register(helmet);

  app.setErrorHandler((error, request, reply) => {
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
    if (error instanceof ApiError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }
    const status =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? Number(error.statusCode)
        : 500;
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
      error: { code: 'INTERNAL_ERROR', message: 'Ocorreu um erro inesperado. Tente novamente.' },
    });
  });
  app.setNotFoundHandler((_request, reply) => {
    return reply
      .status(404)
      .send({ error: { code: 'NOT_FOUND', message: 'Endereço não encontrado.' } });
  });

  app.get('/api/health', async () => ({ status: 'ok' }));
  app.get('/api/tasks', async (request) => ({
    data: repository.listTasks(taskQuerySchema.parse(request.query)),
  }));
  app.post('/api/tasks', async (request, reply) => {
    const task = repository.saveTask(taskSchema.parse(request.body));
    return reply.status(201).send({ data: task });
  });
  app.put<{ Params: { id: string } }>('/api/tasks/:id', async (request) => ({
    data: repository.saveTask(taskSchema.parse(request.body), idSchema.parse(request.params.id)),
  }));
  app.delete<{ Params: { id: string } }>('/api/tasks/:id', async (request, reply) => {
    repository.deleteTask(idSchema.parse(request.params.id));
    return reply.status(204).send();
  });

  app.get('/api/tags', async () => ({ data: repository.listTags() }));
  app.post('/api/tags', async (request, reply) => {
    const tag = repository.saveTag(tagSchema.parse(request.body));
    return reply.status(201).send({ data: tag });
  });
  app.put<{ Params: { id: string } }>('/api/tags/:id', async (request) => ({
    data: repository.saveTag(tagSchema.parse(request.body), idSchema.parse(request.params.id)),
  }));
  app.delete<{ Params: { id: string } }>('/api/tags/:id', async (request, reply) => {
    repository.deleteTag(idSchema.parse(request.params.id));
    return reply.status(204).send();
  });
  app.get<{ Params: { year: string } }>('/api/holidays/:year', async (request) => ({
    data: await holidays.list(yearSchema.parse(request.params.year)),
  }));
  await app.ready();
  return app;
}
