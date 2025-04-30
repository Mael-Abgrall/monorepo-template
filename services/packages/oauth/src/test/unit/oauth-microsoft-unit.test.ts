import type { Environment } from 'service-utils/environment';
import { environment, setEnvironment } from 'service-utils/environment';
import { serverFetch } from 'service-utils/fetch';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OAuthCodeResponse } from '../../oauth-google';
import { decoder } from '../../oauth-jwt';
import {
  decodeTokenMicrosoft,
  exchangeCodeMicrosoft,
  generateInitUrlMicrosoft,
} from '../../oauth-microsoft';

vi.mock('../../oauth-jwt');
vi.mock('service-utils/uuid', () => {
  return {
    uuidV5: vi.fn().mockReturnValue('mocked-uuid'),
  };
});
vi.mock('service-utils/fetch', () => {
  return {
    serverFetch: vi.fn(),
  };
});
vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      captureException: vi.fn(),
    },
  };
});

beforeAll(() => {
  setEnvironment({ env: process.env as unknown as Environment });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('decodeTokenMicrosoft', () => {
  it('should successfully decode a valid token', async () => {
    vi.mocked(decoder).mockReturnValue({
      oid: '123',
      // eslint-disable-next-line camelcase -- external code
      preferred_username: 'test@example.com',
    });

    const result = await decodeTokenMicrosoft({ idToken: 'fake-token' });

    expect(result).toEqual({
      email: 'test@example.com',
      userID: '123',
    });
    expect(decoder).toHaveBeenCalledWith('fake-token');
  });

  it('should throw error when preferred_username is missing', async () => {
    vi.mocked(decoder).mockReturnValue({
      oid: '123',
    });

    await expect(
      decodeTokenMicrosoft({ idToken: 'fake-token' }),
    ).rejects.toThrow('No preferred_username in Microsoft id token');
  });

  it('should throw error when oid is missing', async () => {
    vi.mocked(decoder).mockReturnValue({
      // eslint-disable-next-line camelcase -- external code
      preferred_username: 'test@example.com',
    });

    await expect(
      decodeTokenMicrosoft({ idToken: 'fake-token' }),
    ).rejects.toThrow('No oid in Microsoft id token');
  });
});

describe('exchangeCodeMicrosoft', () => {
  it('should successfully exchange code for tokens', async () => {
    const mockResponse = {
      // eslint-disable-next-line camelcase -- external code
      id_token: 'mock-id-token',
    } satisfies OAuthCodeResponse;

    vi.mocked(serverFetch).mockResolvedValue(mockResponse);

    const result = await exchangeCodeMicrosoft({ code: 'test-code' });

    expect(result).toEqual(mockResponse);
    expect(serverFetch).toHaveBeenCalledOnce();
    expect(serverFetch).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        body: new URLSearchParams({
          client_id: environment.MICROSOFT_CLIENT_ID,
          client_secret: environment.MICROSOFT_CLIENT_SECRET,
          code: 'test-code',
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:5173/auth/callback/microsoft',
        }),
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
      },
    );
  });
});

describe('generateInitUrlMicrosoft', () => {
  it('should generate correct URL with all required parameters', async () => {
    const state = 'test-state';
    const url = await generateInitUrlMicrosoft({ state });
    const parsedUrl = new URL(url);

    expect(parsedUrl.origin + parsedUrl.pathname).toBe(
      'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    );

    expect(parsedUrl.searchParams.get('client_id')).toBe(
      environment.MICROSOFT_CLIENT_ID,
    );
    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/auth/callback/microsoft',
    );
    expect(parsedUrl.searchParams.get('response_type')).toBe('code');
    expect(parsedUrl.searchParams.get('scope')).toBe('profile openid email');
    expect(parsedUrl.searchParams.get('state')).toBe('test-state');
  });

  it('should generate unique URLs for different states', async () => {
    const url1 = await generateInitUrlMicrosoft({ state: 'state1' });
    const url2 = await generateInitUrlMicrosoft({ state: 'state2' });

    expect(url1).not.toBe(url2);

    const parsedUrl1 = new URL(url1);
    const parsedUrl2 = new URL(url2);

    expect(parsedUrl1.searchParams.get('state')).toBe('state1');
    expect(parsedUrl2.searchParams.get('state')).toBe('state2');
  });

  it('should use the correct frontend URL from environment', async () => {
    setEnvironment({
      env: {
        ...process.env,
        DOMAIN: 'example',
      } as unknown as Environment,
    });

    const url = await generateInitUrlMicrosoft({ state: 'test-state' });
    const parsedUrl = new URL(url);

    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
      'https://app.example.com/auth/callback/microsoft',
    );
  });
});
