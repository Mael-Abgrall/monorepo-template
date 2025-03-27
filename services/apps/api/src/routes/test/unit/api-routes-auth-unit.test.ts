import type { Environment } from 'service-utils/environment';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../..';
import { createTokens } from '../../../helpers/api-helpers-jwt';

vi.mock('core/auth');
const authCore = await import('core/auth');
vi.mock('hono/cookie');
const cookieModule = await import('hono/cookie');
vi.mock('core/user');
const userCore = await import('core/user');
vi.mock('service-utils/analytics');
const analyticsModule = await import('service-utils/analytics');

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

// @ts-expect-error -- we are mocking the analytics module
analyticsModule.analytics = {
  capture: vi.fn().mockResolvedValue(undefined),
};

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
      redirectUrl: 'https://mock-oauth-url.com',
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
      email: 'test@example.com',
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
      email: 'test@example.com',
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
    authCore.getOTPUserByEmail = vi.fn().mockResolvedValue({
      createdAt: new Date(),
      email: 'test@example.com',
      id: 'test-user-id',
      lastActivity: new Date(),
      updatedAt: new Date(),
    } satisfies Awaited<ReturnType<typeof authCore.getOTPUserByEmail>>);

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

    expect(authCore.getOTPUserByEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(authCore.initOTP).toHaveBeenCalledWith({
      email: 'test@example.com',
      userID: 'test-user-id',
    });
  });

  it('should initialize OTP for non-existing user', async () => {
    authCore.getOTPUserByEmail = vi.fn().mockResolvedValue(undefined);
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

    expect(authCore.getOTPUserByEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
    expect(authCore.initOTP).toHaveBeenCalledWith({
      email: 'test@example.com',
      userID: undefined,
    });
  });

  it('should prevent spam', async () => {
    authCore.getOTPUserByEmail = vi.fn().mockResolvedValue(undefined);
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

  it('should reject when the email is already in use', async () => {
    authCore.asActiveTokens = vi.fn().mockResolvedValue(false);
    authCore.getOTPUserByEmail = vi
      .fn()
      .mockRejectedValue(new Error('Email already in use'));

    const response = await app.request('/auth/otp/init', {
      body: JSON.stringify({
        email: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(409);
    const text = await response.text();
    expect(text).toEqual('Email already in use');
  });

  it('should reject 500 when the error is not an email error', async () => {
    authCore.asActiveTokens = vi.fn().mockResolvedValue(false);
    authCore.getOTPUserByEmail = vi
      .fn()
      .mockRejectedValue(new Error('undefined'));
    analyticsModule.analytics.captureException = vi
      .fn()
      .mockResolvedValue(undefined);

    const response = await app.request('/auth/otp/init', {
      body: JSON.stringify({
        email: 'test@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toEqual('Internal Server Error');
  });

  it('should reject when the email is not valid', async () => {
    authCore.asActiveTokens = vi.fn().mockResolvedValue(false);
    authCore.getOTPUserByEmail = vi
      .fn()
      .mockRejectedValue(
        new Error('Fetch error: 422 [POST] https://api.postmarkapp.com/email'),
      );

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
    expect(text).toEqual('Email is not valid');
  });
});

describe('POST otp/finish', () => {
  it('should finish the OTP flow for existing user, and send an analytics event', async () => {
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
    expect(analyticsModule.analytics.capture).toHaveBeenCalledWith({
      distinctId: 'test-user-id',
      event: 'otp_login',
    });
  });

  it('should finish the OTP flow for new user, and send an analytics event', async () => {
    authCore.finishOTP = vi.fn().mockResolvedValue({
      onboardUser: true,
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
      onboardUser: true,
    });

    expect(authCore.finishOTP).toHaveBeenCalledWith({
      token: 'test-token',
      tokenID: 'token-id',
    });
    expect(cookieModule.deleteCookie).toHaveBeenCalled();
    expect(cookieModule.setSignedCookie).toHaveBeenCalledTimes(2);
    expect(analyticsModule.analytics.capture).toHaveBeenCalledWith({
      distinctId: 'test-user-id',
      event: 'otp_create_user',
    });
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

describe('POST /refresh', () => {
  it('should return 401 if no refresh token cookie exists', async () => {
    cookieModule.getSignedCookie = vi
      .fn()
      .mockResolvedValue(
        undefined satisfies Awaited<
          ReturnType<typeof cookieModule.getSignedCookie>
        >,
      );

    const response = await app.request('/auth/refresh', {
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toEqual('No refresh token');
  });

  it('should return 401 if refresh token is invalid', async () => {
    cookieModule.getSignedCookie = vi
      .fn()
      .mockResolvedValue(
        'invalid-token' satisfies Awaited<
          ReturnType<typeof cookieModule.getSignedCookie>
        >,
      );

    const response = await app.request('/auth/refresh', {
      method: 'POST',
    });

    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toEqual('Invalid refresh token');
  });

  it('should refresh auth cookies if token is valid', async () => {
    const validToken = await createTokens({ userID: 'test' });
    cookieModule.getSignedCookie = vi
      .fn()
      .mockResolvedValue(validToken.refreshToken);

    const response = await app.request('/auth/refresh', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: 'Ok' });
    expect(cookieModule.setSignedCookie).toHaveBeenCalledTimes(2);
  });
});

describe('POST /logout', () => {
  it('should clear auth cookies and return success', async () => {
    cookieModule.deleteCookie = vi
      .fn()
      .mockResolvedValue(
        undefined satisfies Awaited<
          ReturnType<typeof cookieModule.deleteCookie>
        >,
      );

    const response = await app.request('/auth/logout', {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ message: 'Ok' });
    expect(cookieModule.deleteCookie).toHaveBeenCalledTimes(2);
    expect(cookieModule.deleteCookie).toHaveBeenCalledWith(
      expect.anything(),
      'accessToken',
    );
    expect(cookieModule.deleteCookie).toHaveBeenCalledWith(
      expect.anything(),
      'refreshToken',
    );
  });
});
