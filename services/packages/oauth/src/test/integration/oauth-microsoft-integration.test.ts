import type { Environment } from 'service-utils/environment';
import type { ServerFetchError } from 'service-utils/fetch';
import { environment, setEnvironment } from 'service-utils/environment';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exchangeCodeMicrosoft } from '../../oauth-microsoft';

beforeEach(() => {
  vi.clearAllMocks();
});

vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      captureException: vi.fn(),
    },
  };
});

describe('exchangeCodeMicrosoft', () => {
  it('should throw errors without sensitive data', async () => {
    setEnvironment({
      env: {
        ...process.env,
        MICROSOFT_CLIENT_ID: 'test-client-id',
        MICROSOFT_CLIENT_SECRET: 'test-client-secret',
      } as unknown as Environment,
    });

    const error = (await exchangeCodeMicrosoft({
      code: 'sensitive-oauth-code',
    }).then(
      () => {
        throw new Error('should not resolve');
      },
      (error: unknown) => {
        return error;
      },
    )) as ServerFetchError;

    expect(error).toBeInstanceOf(Error);
    expect(error.message).not.toContain('sensitive-oauth-code');
    expect(error.message).not.toContain(environment.MICROSOFT_CLIENT_ID);
    expect(error.message).not.toContain(environment.MICROSOFT_CLIENT_SECRET);

    const options = error.options as { body: URLSearchParams };
    for (const value of options.body.values()) {
      expect(value).not.toContain('sensitive-oauth-code');
      expect(value).not.toContain(environment.MICROSOFT_CLIENT_ID);
      expect(value).not.toContain(environment.MICROSOFT_CLIENT_SECRET);
    }
  });
});
