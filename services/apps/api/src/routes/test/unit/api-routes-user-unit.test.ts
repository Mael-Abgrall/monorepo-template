import type { Environment } from 'service-utils/environment';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../..';
import { getSignedCookieCustom } from '../../../helpers/api-helpers-cookies';
import { verifyToken } from '../../../helpers/api-helpers-jwt';

vi.mock('core/user');
const userCore = await import('core/user');
vi.mock('../../../helpers/api-helpers-cookies');
vi.mock('../../../helpers/api-helpers-jwt');

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

const mockUser = {
  createdAt: new Date(),
  email: 'test@test.com',
  id: 'test-user-id',
  lastActivity: new Date(),
  updatedAt: new Date(),
};

describe('GET /user/me', () => {
  it('is protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    const response = await app.request('/user/me');
    expect(response.status).toBe(401);
  });

  it('should return the current user', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);
    userCore.getUser = vi
      .fn()
      .mockResolvedValue(
        mockUser satisfies Awaited<ReturnType<typeof userCore.getUser>>,
      );

    const response = await app.request('/user/me');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      createdAt: mockUser.createdAt.toISOString(),
      email: mockUser.email,
      id: mockUser.id,
      lastActivity: mockUser.lastActivity.toISOString(),
      updatedAt: mockUser.updatedAt.toISOString(),
    });
  });

  it('should return 404 if the user is not found', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);
    userCore.getUser = vi.fn().mockResolvedValue(undefined);
    const response = await app.request('/user/me');
    expect(response.status).toBe(404);
  });
});
