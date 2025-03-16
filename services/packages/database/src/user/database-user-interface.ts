import type { NewUser, User } from './database-user-schemas';
import { getUserById, insertUser } from './database-user';
import { getUserFromCache, setUserInCache } from './database-user-cache';

/**
 * Create a new user
 * @param root named parameters
 * @param root.user The user data to create
 * @returns The created user
 */
export async function createUser({ user }: { user: NewUser }): Promise<User> {
  const createdUser = await insertUser({ user });
  setUserInCache({ user: createdUser });
  return createdUser;
}

/**
 * Get a user by their ID
 * @param root named parameters
 * @param root.userID The user ID to get
 * @returns The user
 */
export async function getUser({
  userID,
}: {
  userID: string;
}): Promise<undefined | User> {
  const userFromCache = getUserFromCache({ userID });
  if (userFromCache) {
    return userFromCache;
  }
  const user = await getUserById({ id: userID });
  if (user) {
    setUserInCache({ user });
  }
  return user;
}

export { getUserByEmail } from './database-user';
export type { User } from './database-user-schemas';
export {
  insertVerificationToken as createVerificationToken,
  deleteAndFlushVerificationTokens,
  getVerificationToken,
} from './database-user-verify';
