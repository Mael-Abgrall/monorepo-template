import type { Context } from 'hono';
import { getPostgreSQL } from 'database/postgresql';
import { createMiddleware } from 'hono/factory';
import type { Environment } from '../context.js';

export const databaseMiddleware = createMiddleware(
  async (context: Context, next) => {
    const pgDatabase = getPostgreSQL({ env: context.env as Environment });
    context.set('pgDatabase', pgDatabase);
    await next();
  },
);
