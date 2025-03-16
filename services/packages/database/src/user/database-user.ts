import { eq } from 'drizzle-orm';
import type { NewUser, User } from './database-user-schemas';
import { pgDatabase } from '../database-pg';
import { usersTable } from './database-user-schemas';

/**
 * Get a user by their email
 * @param root named parameters
 * @param root.email The email to search for
 * @returns The user or undefined if not found
 */
export async function getUserByEmail({
  email,
}: {
  email: string;
}): Promise<undefined | User> {
  const users = await pgDatabase
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  return users[0];
}

/**
 * Get a user by their ID
 * @param root named parameters
 * @param root.id The user ID to search for
 * @returns The user or undefined if not found
 */
export async function getUserById({
  id,
}: {
  id: string;
}): Promise<undefined | User> {
  const users = await pgDatabase
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, id));
  return users[0];
}

/**
 * Insert a new user into the database
 * @param root named parameters
 * @param root.user The user data to insert
 * @returns The created user
 */
export async function insertUser({ user }: { user: NewUser }): Promise<User> {
  const createdUser = await pgDatabase
    .insert(usersTable)
    .values(user)
    .returning();
  return createdUser[0];
}
