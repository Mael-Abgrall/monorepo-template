import type { Environment } from 'service-utils/environment';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../..';

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock('core/auth');
const authCore = await import('core/auth');
vi.mock('hono/cookie');
const cookieModule = await import('hono/cookie');
vi.mock('core/user');
const userCore = await import('core/user');

describe('GET oauth/init', () => {
  it('should generate OAuth URL and set state cookie', async () => {
    authCore.initOAuth = vi
      .fn()
      .mockResolvedValue('https://mock-oauth-url.com');
    cookieModule.setSignedCookie = vi.fn().mockResolvedValue('test-state');

    const response = await app.request('/auth/oauth/init?vendor=microsoft', {
      method: 'GET',
    });

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      initUrl: 'https://mock-oauth-url.com',
    });

    expect(cookieModule.setSignedCookie).toHaveBeenCalled();
  });
});

describe('POST oauth/finish', () => {
  it('should validate state and create auth cookies for existing user', async () => {
    authCore.exchangeCode = vi.fn().mockResolvedValue({
      email: 'test@example.com',
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof authCore.exchangeCode>>);
    userCore.getUser = vi.fn().mockResolvedValue({
      createdAt: new Date(),
      email: 'test@example.com',
      id: 'test-user-id',
      lastActivity: new Date(),
      updatedAt: new Date(),
    } satisfies Awaited<ReturnType<typeof userCore.getUser>>);
    cookieModule.getSignedCookie = vi.fn().mockResolvedValue('test-state');

    const response = await app.request('/auth/oauth/finish', {
      body: JSON.stringify({
        code: 'test-code',
        stateFromUrl: 'test-state',
        vendor: 'microsoft',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      verified: true,
    });

    expect(authCore.exchangeCode).toHaveBeenCalledWith({
      code: 'test-code',
      vendor: 'microsoft',
    });
    expect(cookieModule.setSignedCookie).toHaveBeenCalledTimes(2);
  });

  it('should request an OTP when the user does not exist', async () => {
    authCore.exchangeCode = vi.fn().mockResolvedValue({
      email: 'test@example.com',
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof authCore.exchangeCode>>);
    userCore.getUser = vi.fn().mockResolvedValue(undefined);
    authCore.initOTP = vi.fn().mockResolvedValue(undefined);

    const response = await app.request('/auth/oauth/finish', {
      body: JSON.stringify({
        code: 'test-code',
        stateFromUrl: 'test-state',
        vendor: 'microsoft',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      verified: false,
    });

    expect(authCore.exchangeCode).toHaveBeenCalledWith({
      code: 'test-code',
      vendor: 'microsoft',
    });
    expect(authCore.initOTP).toHaveBeenCalledWith({
      email: 'test@example.com',
      userID: 'test-user-id',
    });
  });

  it('should reject when states do not match', async () => {
    cookieModule.getSignedCookie = vi.fn().mockResolvedValue('test-cookie');

    const response = await app.request('/auth/oauth/finish', {
      body: JSON.stringify({
        code: 'test-code',
        stateFromUrl: 'different-state',
        vendor: 'microsoft',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toEqual('State does not match');

    expect(authCore.exchangeCode).not.toHaveBeenCalled();
    expect(userCore.getUser).not.toHaveBeenCalled();
  });

  it('should reject when there is no state cookie', async () => {
    cookieModule.getSignedCookie = vi.fn().mockResolvedValue(undefined);

    const response = await app.request('/auth/oauth/finish', {
      body: JSON.stringify({
        code: 'test-code',
        stateFromUrl: 'test-state',
        vendor: 'microsoft',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toEqual('No state cookie');

    expect(authCore.exchangeCode).not.toHaveBeenCalled();
    expect(userCore.getUser).not.toHaveBeenCalled();
  });
});

describe('POST otp/init', () => {
  it('should initialize OTP for existing user', async () => {
    authCore.getUserByEmail = vi.fn().mockResolvedValue({
      createdAt: new Date(),
      email: 'test@example.com',
      id: 'test-user-id',
      lastActivity: new Date(),
      updatedAt: new Date(),
    } satisfies Awaited<ReturnType<typeof authCore.getUserByEmail>>);

    authCore.initOTP = vi.fn().mockResolvedValue(undefined);

    const response = await app.request('/auth/otp/init', {
      body: JSON.stringify({
        email: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      message: 'Ok',
    });

    expect(authCore.getUserByEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(authCore.initOTP).toHaveBeenCalledWith({
      email: 'test@example.com',
      userID: 'test-user-id',
    });
  });

  it('should initialize OTP for non-existing user', async () => {
    authCore.getUserByEmail = vi.fn().mockResolvedValue(undefined);
    authCore.initOTP = vi.fn().mockResolvedValue(undefined);

    const response = await app.request('/auth/otp/init', {
      body: JSON.stringify({
        email: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      message: 'Ok',
    });

    expect(authCore.getUserByEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(authCore.initOTP).toHaveBeenCalledWith({
      email: 'test@example.com',
      userID: undefined,
    });
  });

  it('should prevent spam', async () => {
    authCore.getUserByEmail = vi.fn().mockResolvedValue(undefined);
    authCore.initOTP = vi.fn().mockResolvedValue(undefined);
    authCore.asActiveTokens = vi.fn().mockResolvedValue(true);

    const response = await app.request('/auth/otp/init', {
      body: JSON.stringify({
        email: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(422);
    const text = await response.text();
    expect(text).toEqual('Wait before requesting another OTP');
  });
});

describe('POST otp/finish', () => {
  it('should finish the OTP flow for existing user', async () => {
    authCore.finishOTP = vi.fn().mockResolvedValue({
      onboardUser: false,
      user: {
        createdAt: new Date(),
        email: 'test@example.com',
        id: 'test-user-id',
        lastActivity: new Date(),
        updatedAt: new Date(),
      },
    } satisfies Awaited<ReturnType<typeof authCore.finishOTP>>);
    cookieModule.getSignedCookie = vi.fn().mockResolvedValue('token-id');
    cookieModule.deleteCookie = vi.fn().mockResolvedValue(undefined);
    cookieModule.setSignedCookie = vi.fn().mockResolvedValue(undefined);
    const response = await app.request('/auth/otp/finish', {
      body: JSON.stringify({
        token: 'test-token',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      onboardUser: false,
    });

    expect(authCore.finishOTP).toHaveBeenCalledWith({
      token: 'test-token',
      tokenID: 'token-id',
    });
    expect(cookieModule.deleteCookie).toHaveBeenCalled();
    expect(cookieModule.setSignedCookie).toHaveBeenCalledTimes(2);
  });

  it('throws when the OTP is invalid', async () => {
    authCore.finishOTP = vi.fn().mockRejectedValue(new Error('Invalid token'));

    const response = await app.request('/auth/otp/finish', {
      body: JSON.stringify({
        token: 'test-token',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toEqual('Invalid OTP');
  });

  it('should reject invalid token ID', async () => {
    authCore.finishOTP = vi.fn().mockResolvedValue(undefined);
    cookieModule.getSignedCookie = vi.fn().mockResolvedValue(undefined);
    const response = await app.request('/auth/otp/finish', {
      body: JSON.stringify({
        token: 'test-token',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text).toEqual('No token ID cookie');

    expect(authCore.finishOTP).not.toHaveBeenCalled();
  });
});
