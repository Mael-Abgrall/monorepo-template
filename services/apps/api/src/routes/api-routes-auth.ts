import type { Context } from 'hono';
import type { Environment } from 'service-utils/environment';
import type {
  OauthFinishResponse,
  OauthInitResponse,
  OtpFinishResponse,
} from 'shared/schemas/shared-auth-schemas';
import type { GenericResponse } from 'shared/schemas/shared-schemas';
import {
  asActiveTokens,
  exchangeCode,
  finishOTP,
  getOTPUserByEmail,
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
import { analytics } from 'service-utils/analytics';
import {
  oauthFinishBodySchema,
  oauthFinishResponseSchema,
  oauthInitQuerySchema,
  oauthInitResponseSchema,
  otpFinishBodySchema,
  otpFinishResponseSchema,
  otpInitBodySchema,
} from 'shared/schemas/shared-auth-schemas';
import { genericResponseSchema } from 'shared/schemas/shared-schemas';
import type { Variables } from '../context.js';
import type { RefreshToken } from '../helpers/api-helpers-jwt.js';
import {
  getSignedCookieCustom,
  setSignedCookieCustom,
} from '../helpers/api-helpers-cookies.js';
import { createTokens, verifyToken } from '../helpers/api-helpers-jwt.js';
import { validateResponse } from '../helpers/api-helpers-response-validator.js';

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
            schema: oauthInitResponseSchema,
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

    return context.json(
      validateResponse({
        response: { redirectUrl: url } satisfies OauthInitResponse,
        schema: oauthInitResponseSchema,
      }),
    );
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
      analytics.capture({
        distinctId: userID,
        event: 'oauth_create_user',
        properties: {
          email,
          vendor,
        },
      });
      const tokenID = await initOTP({ email, userID });
      await setSignedCookieCustom({
        context,
        name: 'tokenID',
        value: tokenID,
      });
      return context.json(
        validateResponse({
          response: {
            email,
            verified: false,
          } satisfies OauthFinishResponse,
          schema: oauthFinishResponseSchema,
        }),
      );
    }

    analytics.capture({
      distinctId: userID,
      event: 'oauth_login',
      properties: {
        email,
        vendor,
      },
    });
    await createAuthCookies({ context, userID: user.id });
    return context.json(
      validateResponse({
        response: {
          email,
          verified: true,
        } satisfies OauthFinishResponse,
        schema: oauthFinishResponseSchema,
      }),
    );
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
      409: {
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

    try {
      const user = await getOTPUserByEmail({ email });
      const tokenID = await initOTP({ email, userID: user?.id });
      await setSignedCookieCustom({
        context,
        name: 'tokenID',
        value: tokenID,
      });
      return context.json(
        validateResponse({
          response: { message: 'Ok' },
          schema: genericResponseSchema,
        }),
      );
    } catch (error) {
      if (error instanceof Error && error.message === 'Email already in use') {
        throw new HTTPException(409, {
          message: 'Email already in use',
        });
      }
      if (
        error instanceof Error &&
        error.message.includes(
          'Fetch error: 422 [POST] https://api.postmarkapp.com/email',
        )
      ) {
        throw new HTTPException(422, {
          message: 'Email is not valid',
        });
      }
      throw error;
    }
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
      analytics.capture({
        distinctId: user.id,
        event: onboardUser ? 'otp_create_user' : 'otp_login',
      });
      await createAuthCookies({ context, userID: user.id });
      return context.json(
        validateResponse({
          response: { onboardUser } satisfies OtpFinishResponse,
          schema: otpFinishResponseSchema,
        }),
      );
    } catch {
      throw new HTTPException(401, { message: 'Invalid OTP' });
    }
  },
);

authRouter.post(
  'refresh',
  describeRoute({
    description: 'Refresh the auth cookie',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: genericResponseSchema,
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
  async (context) => {
    const refreshTokenFromCookie = await getSignedCookieCustom({
      context,
      name: 'refreshToken',
    });
    if (!refreshTokenFromCookie) {
      throw new HTTPException(401, { message: 'No refresh token' });
    }

    const tokenData = await verifyToken<RefreshToken>({
      token: refreshTokenFromCookie,
    });
    if (!tokenData) {
      throw new HTTPException(401, { message: 'Invalid refresh token' });
    }
    const { userID } = tokenData;
    await createAuthCookies({ context, userID });
    return context.json(
      validateResponse({
        response: { message: 'Ok' } satisfies GenericResponse,
        schema: genericResponseSchema,
      }),
    );
  },
);

authRouter.post(
  'logout',
  describeRoute({
    description: 'Logout the user',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: genericResponseSchema,
          },
        },
      },
    },
    tags: ['auth'],
  }),
  async (context) => {
    deleteCookie(context, 'accessToken');
    deleteCookie(context, 'refreshToken');
    return context.json({ message: 'Ok' } satisfies GenericResponse);
  },
);
