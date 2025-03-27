import type { Environment } from 'service-utils/environment';
import type { GetMeResponse } from 'shared/schemas/shared-user-schemas';
import { getUser } from 'core/user';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { HTTPException } from 'hono/http-exception';
import { getMeResponseSchema } from 'shared/schemas/shared-user-schemas';
import type { Variables } from '../context';
import { authMiddleware } from '../middleware/api-middleware-auth';

const userRouter = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

userRouter.use(authMiddleware);
userRouter.get(
  '/me',
  describeRoute({
    responses: {
      200: {
        content: {
          'application/json': {
            schema: getMeResponseSchema,
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    summary: 'Get the current user',
    tags: ['user'],
  }),
  async (context) => {
    const user = await getUser({ userID: context.get('userID') });
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' });
    }
    return context.json(user satisfies GetMeResponse);
  },
);

export { userRouter };
