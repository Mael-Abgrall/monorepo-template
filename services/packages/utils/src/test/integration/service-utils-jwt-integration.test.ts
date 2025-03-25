import { describe, expect, it } from 'vitest';
import { decodeToken } from '../../service-utils-jwt';

interface TestTokenPayload {
  email: string;
  sub: string;
}

describe('decodeToken', () => {
  it('should decode a valid token', async () => {
    const validToken =
      // eslint-disable-next-line sonarjs/no-hardcoded-secrets -- this is a test token
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20ifQ.xxxxxx';

    const result = await decodeToken<TestTokenPayload>({ token: validToken });

    expect(result).toEqual({
      email: 'test@example.com',
      sub: '123',
    });
  });

  it('should throw error for invalid token format', async () => {
    const invalidToken = 'not-a-valid-token';

    await expect(
      decodeToken<TestTokenPayload>({ token: invalidToken }),
    ).rejects.toThrow();
  });
});
