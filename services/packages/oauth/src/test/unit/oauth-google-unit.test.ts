import type { Environment } from 'service-utils/environment';
import { environment, setEnvironment } from 'service-utils/environment';
import { serverFetch } from 'service-utils/fetch';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { OAuthCodeResponse } from '../../oauth-google';
import {
  decodeTokenGoogle,
  exchangeCodeGoogle,
  generateInitUrlGoogle,
} from '../../oauth-google';
import { decoder } from '../../oauth-jwt';

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

describe('decodeTokenGoogle', () => {
  it('should successfully decode a valid token', async () => {
    vi.mocked(decoder).mockReturnValue({
      email: 'test@example.com',
      sub: 'google-sub-123',
    });

    const result = await decodeTokenGoogle({ idToken: 'fake-token' });

    expect(result).toEqual({
      email: 'test@example.com',
      userID: 'mocked-uuid',
    });
    expect(decoder).toHaveBeenCalledWith('fake-token');
  });

  it('should throw error when email is missing', async () => {
    vi.mocked(decoder).mockReturnValue({
      sub: 'google-sub-123',
    });

    await expect(decodeTokenGoogle({ idToken: 'fake-token' })).rejects.toThrow(
      'No email in Google id token',
    );
  });

  it('should throw error when sub is missing', async () => {
    vi.mocked(decoder).mockReturnValue({
      email: 'test@example.com',
    });

    await expect(decodeTokenGoogle({ idToken: 'fake-token' })).rejects.toThrow(
      'No sub in Google id token',
    );
  });
});

describe('exchangeCodeGoogle', () => {
  it('should successfully exchange code for tokens', async () => {
    const mockResponse = {
      // eslint-disable-next-line camelcase -- external code
      id_token: 'mock-id-token',
    } satisfies OAuthCodeResponse;

    vi.mocked(serverFetch).mockResolvedValue(mockResponse);

    const result = await exchangeCodeGoogle({ code: 'test-code' });

    expect(result).toEqual(mockResponse);
    expect(serverFetch).toHaveBeenCalledOnce();
    expect(serverFetch).toHaveBeenCalledWith(
      'https://oauth2.googleapis.com/token',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        method: 'POST',
        params: {
          client_id: environment.GOOGLE_APP_ID,
          client_secret: environment.GOOGLE_APP_SECRET,
          code: 'test-code',
          grant_type: 'authorization_code',
          redirect_uri: 'http://localhost:5173/auth/callback/google',
        },
      },
    );
  });
});

describe('generateInitUrlGoogle', () => {
  it('should generate correct URL with all required parameters', async () => {
    const state = 'test-state';
    const url = await generateInitUrlGoogle({ state });
    const parsedUrl = new URL(url);

    expect(parsedUrl.origin + parsedUrl.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );

    expect(parsedUrl.searchParams.get('client_id')).toBe(
      environment.GOOGLE_APP_ID,
    );
    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
      'http://localhost:5173/auth/callback/google',
    );
    expect(parsedUrl.searchParams.get('response_type')).toBe('code');
    expect(parsedUrl.searchParams.get('scope')).toBe('email openid');
    expect(parsedUrl.searchParams.get('state')).toBe('test-state');
  });

  it('should generate unique URLs for different states', async () => {
    const url1 = await generateInitUrlGoogle({ state: 'state1' });
    const url2 = await generateInitUrlGoogle({ state: 'state2' });

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

    const url = await generateInitUrlGoogle({ state: 'test-state' });
    const parsedUrl = new URL(url);

    expect(parsedUrl.searchParams.get('redirect_uri')).toBe(
      'https://app.example.com/auth/callback/google',
    );
  });
});
