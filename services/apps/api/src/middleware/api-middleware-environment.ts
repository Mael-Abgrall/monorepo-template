import type { Context } from 'hono';
import type { Environment } from 'service-utils/environment';
import { initPostgreSQL } from 'core/config';
import { createMiddleware } from 'hono/factory';
import { setEnvironment } from 'service-utils/environment';

export const environmentMiddleware = createMiddleware(
  async (context: Context, next) => {
    if (context.env) {
      setEnvironment({ env: context.env as Environment });
      initPostgreSQL({ env: context.env as Environment });
    }
    await next();
  },
);
