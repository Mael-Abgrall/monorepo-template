import { Scalar } from '@scalar/hono-api-reference';
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
      tags: [
        {
          description: `
The user can log in through OAuth (log in with Google / Microsoft) or with email using one time passwords.

Any new user created through OAuth will also be requested to check their email through a OTP.
          `,
          name: 'auth',
        },
        {
          description: `
Regroup all the actions around the user, such as get profile, update profile, etc.
          `,
          name: 'user',
        },
        {
          description: `
The endpoints to interact with the AI, or get the history of the user's chats
          `,
          name: 'chat',
        },
        {
          description: `
A space is a group of chats, files and other data that share a common context and settings.`,
          name: 'space',
        },
        {
          description: `
Documents are files that can be uploaded and indexed for search. Documents are always tied to a space.`,
          name: 'documents',
        },
      ],
    },
  }),
);
app.get(
  '/docs',
  Scalar({
    url: '/openapi',
  }),
);

// eslint-disable-next-line import-x/no-default-export, unicorn/prefer-export-from -- needed for CF workers
export default app;
