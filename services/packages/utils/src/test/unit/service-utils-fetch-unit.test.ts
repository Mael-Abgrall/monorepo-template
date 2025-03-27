import { expect, it } from 'vitest';
import type { ServerFetchError } from '../../service-utils-fetch';
import { serverFetch } from '../../service-utils-fetch';

it('should redact sensitive data from the body', async () => {
  const error = (await serverFetch(
    'https://test.example.com?code=sensitive-oauth-code',
    {
      body: {
        client_id: 'test-client-id',
        client_secret: 'test-client-secret',
        code: 'sensitive-oauth-code',
      },
    },
  ).then(
    () => {
      throw new Error('should not resolve');
    },
    (error: unknown) => {
      return error;
    },
  )) as ServerFetchError;

  expect(error.message).not.toContain('sensitive-oauth-code');
  expect(error.message).not.toContain('test-client-id');
  expect(error.message).not.toContain('test-client-secret');
});
