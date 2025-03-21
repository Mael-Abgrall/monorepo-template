import { apiReference } from '@scalar/hono-api-reference';
import { Hono } from 'hono';
import { openAPISpecs } from 'hono-openapi';
import { cors } from 'hono/cors';
import { environment, type Environment } from 'service-utils/environment';
import { getContextLogger } from 'service-utils/logger';
import type { Variables } from './context.js';
import { environmentMiddleware } from './middleware/api-middleware-environment.js';
import { authRouter } from './routes/api-routes-auth.js';

const app = new Hono<{ Bindings: Environment; Variables: Variables }>();

const logger = getContextLogger('index.ts');

// todo: hide in production
logger.info('documentation available at http://localhost:8787/docs');
app.get(
  '/openapi',
  openAPISpecs(app, {
    documentation: {
      components: {
        securitySchemes: {
          bearerAuth: {
            bearerFormat: 'JWT',
            scheme: 'bearer',
            type: 'http',
          },
        },
      },
      info: {
        title: 'Hono API',
        version: '0',
      },
      openapi: '3.0.0',
      security: [{ bearerAuth: [] }],
      servers: [{ description: 'Local Server', url: 'http://localhost:8787' }],
    },
  }),
);
app.get(
  '/docs',
  apiReference({
    spec: { url: '/openapi' },
  }),
);
app.use(environmentMiddleware);

app.use('*', async (context, next) => {
  const origin =
    environment.DOMAIN === 'localhost'
      ? ['http://localhost:5173', 'http://localhost:8787']
      : ['https://app.example.com', 'https://api.example.com'];
  const corsMiddlewareHandler = cors({
    credentials: true,
    maxAge: 600,
    origin,
  });
  return corsMiddlewareHandler(context, next);
});

app.route('/auth', authRouter);

// eslint-disable-next-line import-x/no-default-export -- needed for CF workers
export default app;
