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
