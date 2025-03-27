import { apiReference } from '@scalar/hono-api-reference';
import { openAPISpecs } from 'hono-openapi';
import { getContextLogger } from 'service-utils/logger';
import { default as app } from './index.js';

const logger = getContextLogger('development.ts');

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

// eslint-disable-next-line import-x/no-default-export, unicorn/prefer-export-from -- needed for CF workers
export default app;
