import { Context, Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/typebox';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { timingSafeEqual } from 'node:crypto';
import { ENVIRONMENT, type Environment } from 'service-utils/environment';
import { createTokens } from '../helpers/api-helpers-jwt.js';
import {
  oauthFinishBodySchema,
  oauthInitQuerySchema,
  otpInitBodySchema,
  otpFinishBodySchema,
} from 'shared/schemas/shared-auth-schemas';
import { Type } from 'shared/typebox';
import type { Variables } from '../context.js';
import {
  initOTP,
  exchangeCode,
  finishOTP,
  getUserByEmail,
  initOAuth,
} from 'core/auth';
import { getUser } from 'database/user';

export const authRouter = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

/**
 * Create the auth cookies for a user
 * @param root named params
 * @param root.context the context
 * @param root.userID the user id
 */
export async function createAuthCookies({
  context,
  userID,
}: {
  context: Context;
  userID: string;
}): Promise<void> {
  const { accessToken, refreshToken } = await createTokens({ userID });
  await setSignedCookie(
    context,
    ENVIRONMENT.COOKIE_SECRET,
    'accessToken',
    accessToken,
    {
      domain: ENVIRONMENT.DOMAIN,
      httpOnly: true,
      maxAge: 5 * 60, // 5 minutes
      path: '/',
      sameSite: 'Strict',
      secure: true,
    },
  );
  await setSignedCookie(
    context,
    ENVIRONMENT.COOKIE_SECRET,
    'refreshToken',
    refreshToken,
    {
      domain: ENVIRONMENT.DOMAIN,
      httpOnly: true,
      maxAge: 2 * 7 * 24 * 60 * 60, // 2 weeks
      path: '/',
      sameSite: 'Strict',
      secure: true,
    },
  );
}

authRouter.get(
  'oauth/init',
  describeRoute({
    description: 'Generate the initial URL for OAuth',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: Type.Object({
              initUrl: Type.String(),
            }),
          },
        },
      },
    },
    tags: ['auth'],
  }),
  validator('query', oauthInitQuerySchema),
  async (context) => {
    const { vendor } = context.req.valid('query');

    const state = JSON.stringify({
      random: crypto.randomUUID(),
    });
    const url = await initOAuth({ state, vendor });

    await setSignedCookie(context, ENVIRONMENT.COOKIE_SECRET, 'state', state, {
      domain: ENVIRONMENT.DOMAIN,
      httpOnly: true,
      maxAge: 600, // 10 minutes
      path: '/',
      sameSite: 'Strict',
      secure: true,
    });

    return context.json({ initUrl: url });
  },
);

authRouter.post(
  'oauth/finish',
  describeRoute({
    description: 'Finish the OAuth process, and set an auth cookie',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: Type.Object({
              verified: Type.Boolean(),
            }),
          },
        },
      },
    },
    tags: ['auth'],
  }),
  validator('json', oauthFinishBodySchema),
  async (context) => {
    const { code, stateFromUrl, vendor } = context.req.valid('json');
    const stateFromCookie = await getSignedCookie(
      context,
      ENVIRONMENT.COOKIE_SECRET,
      'state',
    );

    if (!stateFromCookie) {
      throw new HTTPException(401, { message: 'No state cookie' });
    }
    const equal = timingSafeEqual(
      Buffer.from(stateFromCookie),
      Buffer.from(stateFromUrl),
    );
    if (!equal) {
      throw new HTTPException(401, { message: 'State does not match' });
    }
    deleteCookie(context, 'state');

    const { email, userID } = await exchangeCode({ code, vendor });

    const user = await getUser({ userID });
    if (!user) {
      await initOTP({ email, userID });
      return context.json({ verified: false });
    }

    await createAuthCookies({ context, userID: user.id });
    return context.json({ verified: true });
  },
);

authRouter.post(
  'otp/init',
  describeRoute({
    description:
      'Initialize the OTP flow: save a cookie with a token ID and send the OTP',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: Type.Object({
              message: Type.Literal('Ok'),
            }),
          },
        },
      },
    },
    tags: ['auth'],
  }),
  validator('json', otpInitBodySchema),
  async (context) => {
    const { email } = context.req.valid('json');
    const user = await getUserByEmail({ email });
    await initOTP({ email, userID: user?.id });
    return context.json({ message: 'Ok' });
    // todo: prevent spam
  },
);

authRouter.post(
  'otp/finish',
  describeRoute({
    description: 'Finish the OTP flow: verify the OTP and set an auth cookie',
    responses: {},
    tags: ['auth'],
  }),
  validator('json', otpFinishBodySchema),
  async (context) => {
    const { token } = context.req.valid('json');
    const tokenID = await getSignedCookie(
      context,
      ENVIRONMENT.COOKIE_SECRET,
      'tokenID',
    );
    if (!tokenID || typeof tokenID !== 'string') {
      throw new HTTPException(401, { message: 'No token ID cookie' });
    }
    const user = await finishOTP({ token, tokenID });
    if (!user) {
      throw new HTTPException(401, { message: 'Invalid OTP' });
    }
    deleteCookie(context, 'tokenID');
    await createAuthCookies({ context, userID: user.id });
    return context.json({ message: 'Ok' });
  },
);
