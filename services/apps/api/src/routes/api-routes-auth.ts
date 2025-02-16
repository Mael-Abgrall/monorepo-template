import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/typebox';
import { deleteCookie, getSignedCookie, setSignedCookie } from 'hono/cookie';
import { HTTPException } from 'hono/http-exception';
import { timingSafeEqual } from 'node:crypto';
import { exchangeCode, generateInitUrl } from 'oauth';
import { ENVIRONMENT, type Environment } from 'service-utils/environment';
import {
  oauthFinishBodySchema,
  oauthInitQuerySchema,
} from 'shared/schemas/shared-auth-schemas';
import { Type } from 'shared/typebox';
import type { Variables } from '../context.js';

export const authRouter = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

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
    const url = await generateInitUrl({ state, vendor });

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
              message: Type.Literal('Ok'),
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
    // todo: checks in DB
    return context.json({ email, userID });
  },
);
