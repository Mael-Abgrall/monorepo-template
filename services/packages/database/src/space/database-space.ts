import { and, eq, sql } from 'drizzle-orm';
import type { Space } from './database-space-schemas';
import { pgDatabase } from '../config/database-postgresql';
import { spaceTable } from './database-space-schemas';

/**
 * Create a new space
 * @param root named parameters
 * @param root.title The title of the space
 * @param root.userID The user ID of the owner of the space
 * @returns The created space
 */
export async function createSpace({
  title,
  userID,
}: {
  title: string;
  userID: string;
}): Promise<Space> {
  const result = await pgDatabase
    .insert(spaceTable)
    .values({
      title,
      userID,
    })
    .returning();

  return result[0];
}

/**
 * Delete a space
 * @param root named parameters
 * @param root.spaceID The ID of the space to delete
 * @param root.userID The user ID of the owner of the space
 */
export async function deleteSpace({
  spaceID,
  userID,
}: {
  spaceID: string;
  userID: string;
}): Promise<void> {
  await pgDatabase
    .delete(spaceTable)
    .where(and(eq(spaceTable.spaceID, spaceID), eq(spaceTable.userID, userID)));
}

/**
 * List all spaces of a user
 * @param root named parameters
 * @param root.userID The user ID of the owner of the spaces
 * @returns The list of spaces
 */
export async function listSpaces({
  userID,
}: {
  userID: string;
}): Promise<Space[]> {
  return await pgDatabase
    .select()
    .from(spaceTable)
    .where(eq(spaceTable.userID, userID));
}

/**
 * Check if a space exists
 * @param root named parameters
 * @param root.spaceID The ID of the space to check
 * @param root.userID The user ID of the owner of the space
 * @returns True if the space exists, false otherwise
 */
export async function spaceExists({
  spaceID,
  userID,
}: {
  spaceID: string;
  userID: string;
}): Promise<boolean> {
  const result = await pgDatabase.execute<{
    exists: boolean;
  }>(
    sql`SELECT EXISTS (SELECT 1 FROM ${spaceTable} WHERE ${eq(spaceTable.spaceID, spaceID)} AND ${eq(spaceTable.userID, userID)}) as exists`,
  );
  return result.rows[0].exists;
}

/**
 * Update a space
 * @param root named parameters
 * @param root.spaceID The ID of the space to update
 * @param root.title The new title of the space
 * @param root.userID The user ID of the owner of the space
 * @param root.visibility The new visibility of the space
 * @returns The updated space
 */
export async function updateSpace({
  spaceID,
  title,
  userID,
  visibility,
}: {
  spaceID: string;
  title: string | undefined;
  userID: string;
  visibility: 'private' | 'public' | undefined;
}): Promise<void> {
  await pgDatabase
    .update(spaceTable)
    .set({
      title,
      visibility,
    })
    .where(and(eq(spaceTable.spaceID, spaceID), eq(spaceTable.userID, userID)));
}
