import { describe, expect, it } from 'vitest';
import { pgDatabase } from '../../../database-pg';
import { verificationTokensTable } from '../../database-user-schemas';
import {
  deleteAndFlushVerificationTokens,
  getVerificationToken,
  insertVerificationToken,
} from '../../database-user-verify';

const testToken = {
  email: 'test@test.com',
  expiresAt: new Date(Date.now() + 3_600_000),
  token: 'test-token-123',
  userID: crypto.randomUUID(),
};
const expiredToken = {
  email: 'expired@test.com',
  expiresAt: new Date(Date.now() - 3_600_000),
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
    const insertedToken = await insertVerificationToken(testToken);
    await insertVerificationToken(expiredToken);

    await deleteAndFlushVerificationTokens({
      tokenID: insertedToken.id,
    });

    const records = await pgDatabase.select().from(verificationTokensTable);
    expect(records).toHaveLength(0);
  });
});
