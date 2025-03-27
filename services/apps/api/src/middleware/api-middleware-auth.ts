import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { getSignedCookieCustom } from '../helpers/api-helpers-cookies';
import { verifyToken } from '../helpers/api-helpers-jwt';

export const authMiddleware = createMiddleware(async (context, next) => {
  const cookieToken = await getSignedCookieCustom({
    context,
    name: 'accessToken',
  });
  if (!cookieToken) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  const accessToken = await verifyToken({ token: cookieToken });
  if (!accessToken) {
    throw new HTTPException(401, { message: 'Unauthorized' });
  }
  context.set('userID', accessToken.userID);
  await next();
});
