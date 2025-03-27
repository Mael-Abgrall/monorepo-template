import type { Environment } from 'service-utils/environment';
import type { ServerFetchError } from 'service-utils/fetch';

import { environment, setEnvironment } from 'service-utils/environment';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exchangeCodeGoogle } from '../../oauth-google';

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

describe('exchangeCodeGoogle', () => {
  it('should throw errors without sensitive data', async () => {
    setEnvironment({
      env: {
        ...process.env,
        GOOGLE_APP_ID: 'test-app-id',
        GOOGLE_APP_SECRET: 'test-app-secret',
      } as unknown as Environment,
    });

    const error = (await exchangeCodeGoogle({
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
    expect(error.message).not.toContain(environment.GOOGLE_APP_ID);
    expect(error.message).not.toContain(environment.GOOGLE_APP_SECRET);
    expect(error.url).not.toContain('sensitive-oauth-code');
    expect(error.url).not.toContain(environment.GOOGLE_APP_ID);
    expect(error.url).not.toContain(environment.GOOGLE_APP_SECRET);
  });
});
