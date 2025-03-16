import { and, eq, gt, lt, or } from 'drizzle-orm';
import type {
  NewVerificationRecord,
  VerificationRecord,
} from './database-user-schemas';
import { pgDatabase } from '../database-pg';
import { verificationTokensTable } from './database-user-schemas';

/**
 * Delete a verification token by its ID, and delete all expired tokens.
 * @param root Named parameters
 * @param root.tokenID The ID of the token to delete.
 */
export async function deleteAndFlushVerificationTokens({
  tokenID,
}: {
  tokenID: string;
}): Promise<void> {
  await pgDatabase
    .delete(verificationTokensTable)
    .where(
      or(
        eq(verificationTokensTable.id, tokenID),
        lt(verificationTokensTable.expiresAt, new Date()),
      ),
    );
}

/**
 * Get a verification token by its token value.
 * @param root Named parameters
 * @param root.token The token value to get.
 * @returns The verification token that was found, or undefined if not found or expired.
 */
export async function getVerificationToken({
  token,
}: {
  token: string;
}): Promise<undefined | VerificationRecord> {
  const record = await pgDatabase
    .select()
    .from(verificationTokensTable)
    .where(
      and(
        eq(verificationTokensTable.token, token),
        gt(verificationTokensTable.expiresAt, new Date()),
      ),
    );

  if (record.length > 0) {
    return {
      email: record[0].email,
      expiresAt: record[0].expiresAt,
      id: record[0].id,
      token: record[0].token,
      userID: record[0].userID ?? undefined,
    } satisfies VerificationRecord;
  }

  return undefined;
}

/**
 * Creates a new verification token for a user.
 * @param root Named parameters
 * @param root.email The email of the user the token is for.
 * @param root.expiresAt The date and time the token will expire.
 * @param root.token The token string.
 * @param root.userID The ID of the user the token is for.
 * @returns The verification token that was created.
 */
export async function insertVerificationToken({
  email,
  expiresAt,
  token,
  userID,
}: NewVerificationRecord): Promise<VerificationRecord> {
  const verificationToken = await pgDatabase
    .insert(verificationTokensTable)
    .values({ email, expiresAt, token, userID: userID })
    .returning();

  return {
    email: verificationToken[0].email,
    expiresAt: verificationToken[0].expiresAt,
    id: verificationToken[0].id,
    token: verificationToken[0].token,
    userID: verificationToken[0].userID ?? undefined,
  } satisfies VerificationRecord;
}
