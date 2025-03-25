import type { Environment } from 'service-utils/environment';
import { setEnvironment } from 'service-utils/environment';
import { describe, expect, it, vi } from 'vitest';
import { getSignedCookieCustom } from '../../api-helpers-cookies';
const cookieModule = await import('hono/cookie');
vi.mock('hono/cookie');

setEnvironment({
  env: process.env as unknown as Environment,
});

describe('getSignedCookieCustom', () => {
  it('should have a consistent return type', async () => {
    cookieModule.getSignedCookie = vi
      .fn()
      .mockResolvedValue(
        false satisfies Awaited<
          ReturnType<typeof cookieModule.getSignedCookie>
        >,
      );

    const cookie = await getSignedCookieCustom({
      // @ts-expect-error -- not testing the context
      context: '',
      name: 'tokenID',
    });
    expect(cookie).toBeUndefined();
  });
});
