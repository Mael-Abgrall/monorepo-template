import { Hono } from 'hono';
import type { Environment, Variables } from './context.js';
import { itemRouter } from './routes/api-routes-items.js';

const app = new Hono<{ Bindings: Environment; Variables: Variables }>();

import { apiReference } from '@scalar/hono-api-reference';
import { openAPISpecs } from 'hono-openapi';
import { databaseMiddleware } from './middleware/api-middleware-database.js';
import { environmentMiddleware } from './middleware/api-middleware-environment.js';
import { authRouter } from './routes/api-routes-auth.js';

app.get(
  '/openapi',
  openAPISpecs(app, {
    documentation: {
      components: {
        securitySchemes: {
          bearerAuth: { bearerFormat: 'JWT', scheme: 'bearer', type: 'http' },
        },
      },
      info: {
        description: 'Greeting API',
        title: 'Hono API',
        version: '1.0.0',
      },
      security: [{ bearerAuth: [] }],
      servers: [{ description: 'Local Server', url: 'http://localhost:8787' }],
    },
  }),
);

// todo remove on prod
app.get(
  '/docs',
  apiReference({
    spec: { url: '/openapi' },
  }),
);

app.use(environmentMiddleware);
app.use(databaseMiddleware);
app.route('/simple', itemRouter);
app.route('/auth', authRouter);

export default app;
