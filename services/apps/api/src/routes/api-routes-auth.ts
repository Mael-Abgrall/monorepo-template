import type { Context } from 'hono';
import type { Environment } from 'service-utils/environment';
import type {
  OauthFinishResponse,
  OtpFinishResponse,
} from 'shared/schemas/shared-auth-schemas';
import {
  asActiveTokens,
  exchangeCode,
  finishOTP,
  getUserByEmail,
  initOAuth,
  initOTP,
} from 'core/auth';
import { getUser } from 'core/user';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/typebox';
import { deleteCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { timingSafeEqual } from 'node:crypto';
import {
  oauthFinishBodySchema,
  oauthFinishResponseSchema,
  oauthInitQuerySchema,
  otpFinishBodySchema,
  otpFinishResponseSchema,
  otpInitBodySchema,
} from 'shared/schemas/shared-auth-schemas';
import { genericResponseSchema } from 'shared/schemas/shared-schemas';
import { Type } from 'shared/typebox';
import type { Variables } from '../context.js';
import {
  getSignedCookieCustom,
  setSignedCookieCustom,
} from '../helpers/api-helpers-cookies.js';
import { createTokens } from '../helpers/api-helpers-jwt.js';

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

  await setSignedCookieCustom({
    context,
    maxAge: 5 * 60, // 5 minutes
    name: 'accessToken',
    value: accessToken,
  });

  await setSignedCookieCustom({
    context,
    maxAge: 2 * 7 * 24 * 60 * 60, // 2 weeks
    name: 'refreshToken',
    value: refreshToken,
  });
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

    await setSignedCookieCustom({
      context,
      name: 'state',
      value: state,
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
            schema: oauthFinishResponseSchema,
          },
        },
      },
      401: {
        content: {
          'application/json': {
            schema: genericResponseSchema,
          },
        },
      },
    },
    tags: ['auth'],
  }),
  validator('json', oauthFinishBodySchema),
  async (context) => {
    const { code, stateFromUrl, vendor } = context.req.valid('json');
    const stateFromCookie = await getSignedCookieCustom({
      context,
      name: 'state',
    });

    if (!stateFromCookie) {
      throw new HTTPException(401, { message: 'No state cookie' });
    }

    const stateFromCookieBuffer = Buffer.from(stateFromCookie);
    const stateFromUrlBuffer = Buffer.from(stateFromUrl);
    if (
      stateFromCookieBuffer.length !== stateFromUrlBuffer.length ||
      !timingSafeEqual(stateFromCookieBuffer, stateFromUrlBuffer)
    ) {
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
    return context.json({ verified: true } satisfies OauthFinishResponse);
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
            schema: genericResponseSchema,
          },
        },
      },
      422: {
        content: {
          'application/json': {
            schema: genericResponseSchema,
          },
        },
      },
    },
    tags: ['auth'],
  }),
  validator('json', otpInitBodySchema),
  async (context) => {
    const { email } = context.req.valid('json');

    const active = await asActiveTokens({ email });
    if (active) {
      throw new HTTPException(422, {
        message: 'Wait before requesting another OTP',
      });
    }

    const user = await getUserByEmail({ email });
    const tokenID = await initOTP({ email, userID: user?.id });
    await setSignedCookieCustom({
      context,
      name: 'tokenID',
      value: tokenID,
    });
    return context.json({ message: 'Ok' });
  },
);

authRouter.post(
  'otp/finish',
  describeRoute({
    description: 'Finish the OTP flow: verify the OTP and set an auth cookie',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: otpFinishResponseSchema,
          },
        },
      },
      401: {
        content: {
          'application/json': {
            schema: genericResponseSchema,
          },
        },
      },
    },
    tags: ['auth'],
  }),
  validator('json', otpFinishBodySchema),
  async (context) => {
    const { token } = context.req.valid('json');
    const tokenID = await getSignedCookieCustom({
      context,
      name: 'tokenID',
    });
    if (!tokenID || typeof tokenID !== 'string') {
      throw new HTTPException(401, { message: 'No token ID cookie' });
    }

    try {
      const { onboardUser, user } = await finishOTP({ token, tokenID });
      deleteCookie(context, 'tokenID');
      await createAuthCookies({ context, userID: user.id });
      return context.json({ onboardUser } satisfies OtpFinishResponse);
    } catch {
      throw new HTTPException(401, { message: 'Invalid OTP' });
    }
  },
);
