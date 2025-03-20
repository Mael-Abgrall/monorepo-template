import { describe, expect, it, vi } from 'vitest';
import { pgDatabase } from '../../../config/database-postgresql';
import { verificationTokensTable } from '../../database-user-schemas';
import {
  asActiveTokens,
  deleteAndFlushVerificationTokens,
  getVerificationToken,
  insertVerificationToken,
} from '../../database-user-verify';

const testToken = {
  email: 'test@test.com',
  token: 'test-token-123',
  userID: crypto.randomUUID(),
};
const expiredToken = {
  email: 'expired@test.com',
  token: 'expired-token-123',
  userID: crypto.randomUUID(),
};

describe('insertVerificationToken', () => {
  it('should successfully insert a verification token and return the id', async () => {
    const token = await insertVerificationToken(testToken);

    expect(typeof token.id).toBe('string');
    expect(token.id).toBeDefined();
  });

  it('should not allow duplicate tokens', async () => {
    await insertVerificationToken(testToken);
    await expect(insertVerificationToken(testToken)).rejects.toThrow();
  });
});

describe('getVerificationToken', () => {
  it('should return the verification token if it exists and is not expired', async () => {
    const insertedToken = await insertVerificationToken(testToken);

    const token = await getVerificationToken({
      token: insertedToken.token,
    });

    expect(token).toBeDefined();
  });

  it('should return undefined if the token does not exist', async () => {
    const token = await getVerificationToken({
      token: crypto.randomUUID(),
    });

    expect(token).toBeUndefined();
  });

  it('should return undefined if the token exists but is expired', async () => {
    const insertedToken = await insertVerificationToken(expiredToken);
    vi.setSystemTime(new Date(Date.now() + 1000 * 60 * 6)); // 6 minutes from now
    const token = await getVerificationToken({
      token: insertedToken.token,
    });

    expect(token).toBeUndefined();
  });
});

describe('deleteAndFlushVerificationTokens', () => {
  it('should delete a verification token by its ID', async () => {
    const insertedToken = await insertVerificationToken(testToken);

    await deleteAndFlushVerificationTokens({
      tokenID: insertedToken.id,
    });

    const token = await getVerificationToken({
      token: insertedToken.token,
    });

    expect(token).toBeUndefined();
  });

  it('should delete all expired tokens', async () => {
    await insertVerificationToken(expiredToken);
    vi.setSystemTime(new Date(Date.now() + 1000 * 60 * 6)); // 6 minutes from now
    const insertedToken = await insertVerificationToken(testToken);

    await deleteAndFlushVerificationTokens({
      tokenID: insertedToken.id,
    });

    const records = await pgDatabase.select().from(verificationTokensTable);
    expect(records).toHaveLength(0);
  });
});

describe('asActiveTokens', () => {
  it('should return true if there are active tokens for a given email', async () => {
    const insertedToken = await insertVerificationToken(testToken);
    await insertVerificationToken({
      email: 'test@test.com',
      token: 'test-token-456',
      userID: crypto.randomUUID(),
    });
    await insertVerificationToken({
      email: 'test@test.com',
      token: 'test-token-789',
      userID: crypto.randomUUID(),
    });

    const active = await asActiveTokens({ email: insertedToken.email });

    expect(active).toBe(true);
  });

  it('should return false if the email does not have any verification tokens', async () => {
    const active = await asActiveTokens({ email: 'test@test.com' });
    expect(active).toBe(false);
  });

  it('should return false if the email has expired tokens', async () => {
    await insertVerificationToken(expiredToken);
    vi.setSystemTime(new Date(Date.now() + 1000 * 60 * 6)); // 6 minutes from now
    const active = await asActiveTokens({ email: expiredToken.email });
    expect(active).toBe(false);
  });

  it('should return false if the email has tokens that are past the resend time', async () => {
    await insertVerificationToken(testToken);
    vi.setSystemTime(new Date(Date.now() + 1000 * 60 * 1)); // 1 minute from now
    const active = await asActiveTokens({ email: testToken.email });
    expect(active).toBe(false);
  });
});
