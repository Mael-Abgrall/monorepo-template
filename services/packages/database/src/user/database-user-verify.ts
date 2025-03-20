import { and, eq, gt, lt, or } from 'drizzle-orm';
import type {
  NewVerificationRecord,
  VerificationRecord,
} from './database-user-schemas';
import { pgDatabase } from '../config/database-postgresql';
import { verificationTokensTable } from './database-user-schemas';

const EXPIRATION_TIME = 1000 * 60 * 5; // 5 minutes
const RESEND_TIME = 1000 * 60 * 1; // 1 minute

/**
 * Verify if there are any active tokens for a given email. This is to prevent spam.
 * @param root Named parameters
 * @param root.email The email of the user the token is for.
 * @returns True if there are active tokens, false otherwise.
 */
export async function asActiveTokens({
  email,
}: {
  email: string;
}): Promise<boolean> {
  const records = await pgDatabase
    .select()
    .from(verificationTokensTable)
    .where(
      and(
        eq(verificationTokensTable.email, email),
        gt(
          verificationTokensTable.createdAt,
          new Date(Date.now() - EXPIRATION_TIME),
        ),
      ),
    );

  return records.some((record) => {
    return record.createdAt > new Date(Date.now() - RESEND_TIME);
  });
}

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
        lt(verificationTokensTable.createdAt, new Date()),
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
        gt(
          verificationTokensTable.createdAt,
          new Date(Date.now() - EXPIRATION_TIME),
        ),
      ),
    );

  if (record.length > 0) {
    return {
      createdAt: record[0].createdAt,
      email: record[0].email,
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
 * @param root.token The token string.
 * @param root.userID The ID of the user the token is for.
 * @returns The verification token that was created.
 */
export async function insertVerificationToken({
  email,
  token,
  userID,
}: NewVerificationRecord): Promise<VerificationRecord> {
  const verificationToken = await pgDatabase
    .insert(verificationTokensTable)
    .values({ createdAt: new Date(), email, token, userID: userID })
    .returning();

  return {
    createdAt: verificationToken[0].createdAt,
    email: verificationToken[0].email,
    id: verificationToken[0].id,
    token: verificationToken[0].token,
    userID: verificationToken[0].userID ?? undefined,
  } satisfies VerificationRecord;
}
