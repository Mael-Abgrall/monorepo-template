import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import { Type } from 'shared/shared-typebox.ts';
import type { Environment, Variables } from '../context.js';

const itemRouter = new Hono<{ Bindings: Environment; Variables: Variables }>();

itemRouter.get(
  '',
  describeRoute({
    description: 'Say hello to the user',
    responses: {
      200: {
        content: {
          'text/plain': {
            schema: Type.Object({
              hello: Type.String(),
            }),
          },
        },
        description: 'Successful greeting response',
      },
    },
  }),
  async (context) => {
    return context.json({ hello: 'world' });
  },
);

export { itemRouter };
