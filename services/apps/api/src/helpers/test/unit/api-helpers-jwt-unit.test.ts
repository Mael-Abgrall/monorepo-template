import type { Environment } from 'service-utils/environment';
import { setEnvironment } from 'service-utils/environment';
import { describe, expect, it, vi } from 'vitest';
import { createTokens, verifyToken } from '../../api-helpers-jwt';

setEnvironment({
  env: process.env as unknown as Environment,
});

const { accessToken } = await createTokens({
  userID: 'test-user-id',
});

describe('verifyToken', () => {
  it('should return undefined if the token is invalid', async () => {
    const result = await verifyToken({ token: 'invalid-token' });
    expect(result).toBeUndefined();
  });

  it('should return undefined if the token is expired', async () => {
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000 * 60 * 60 * 10);
    const result = await verifyToken({ token: accessToken });
    expect(result).toBeUndefined();
  });
});
