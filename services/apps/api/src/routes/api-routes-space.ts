import type { Environment } from 'service-utils/environment';
import type {
  ListSpacesResponse,
  Space,
} from 'shared/schemas/shared-schemas-space';
import { createSpace, listSpaces } from 'core/space';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/typebox';
import {
  listSpacesResponseSchema,
  postSpaceBodySchema,
  postSpaceResponseSchema,
} from 'shared/schemas/shared-schemas-space';
import type { Variables } from '../context';
import { validateResponse } from '../helpers/api-helpers-response-validator';
import { authMiddleware } from '../middleware/api-middleware-auth';

const spaceRouter = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

spaceRouter.use(authMiddleware);

spaceRouter.post(
  '',
  describeRoute({
    description: 'Create a new space',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: postSpaceResponseSchema,
          },
        },
        description: 'The space was created',
      },
    },
    tags: ['Space'],
  }),
  validator('json', postSpaceBodySchema),
  async (context) => {
    const { title } = context.req.valid('json');
    const space = await createSpace({
      title: title ?? 'untitled',
      userID: context.get('userID'),
    });
    return context.json(
      validateResponse({
        response: space satisfies Space,
        schema: postSpaceResponseSchema,
      }),
    );
  },
);

spaceRouter.get(
  '/list',
  describeRoute({
    description: 'List all spaces for the user',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: listSpacesResponseSchema,
          },
        },
        description: 'The list of spaces',
      },
    },
    tags: ['Space'],
  }),
  async (context) => {
    const spaces = await listSpaces({
      userID: context.get('userID'),
    });
    return context.json(
      validateResponse({
        response: spaces satisfies ListSpacesResponse,
        schema: listSpacesResponseSchema,
      }),
    );
  },
);

export { spaceRouter };
