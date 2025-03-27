import type { Environment } from 'service-utils/environment';
import { Hono } from 'hono';
import { describe, expect, it, vi } from 'vitest';
import type { Variables } from '../../../context';
import { getSignedCookieCustom } from '../../../helpers/api-helpers-cookies';
import { verifyToken } from '../../../helpers/api-helpers-jwt';
import { authMiddleware } from '../../api-middleware-auth';

vi.mock('../../../helpers/api-helpers-cookies');
vi.mock('../../../helpers/api-helpers-jwt');

const testApp = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

testApp.use(authMiddleware);
testApp.get('/protected', (c) => {
  return c.json({
    userID: c.get('userID'),
  });
});

describe('authMiddleware', () => {
  it('should return 401 if the cookie is not set', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValue(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );

    const response = await testApp.request('/protected');
    expect(response.status).toBe(401);
  });

  it('should return 401 if the token is invalid', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValue(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValue(
      undefined satisfies Awaited<ReturnType<typeof verifyToken>>,
    );

    const response = await testApp.request('/protected');
    expect(response.status).toBe(401);
  });

  it('should set the userID in the context', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValue(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValue({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const response = await testApp.request('/protected');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      userID: 'test-user-id',
    });
  });
});
