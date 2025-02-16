import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import type { Environment, Variables } from '../context.js';

const itemRouter = new Hono<{ Bindings: Environment; Variables: Variables }>();

itemRouter.get(
  '',
  describeRoute({
    description: 'Say hello to the user',
  }),
  async (context) => {
    return context.json({ hello: 'world' });
  },
);

export { itemRouter };
