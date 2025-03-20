import type { User } from './database-user-schemas';

interface UserCache extends User {
  expiration: Date;
}

const cacheTTL = 1000 * 60 * 60; // 1 hour
/**
 * Implementation of a simple in-memory cache-aside for users.
 * It is made for heavy ID reads.
 */
export const cache = new Map<string, UserCache>();

/**
 * Delete a user from the cache.
 * @param root Named parameters
 * @param root.userID The ID of the user to delete from the cache.
 */
export function deleteUserFromCache({ userID }: { userID: string }): void {
  // eslint-disable-next-line drizzle/enforce-delete-with-where -- not Drizzle
  cache.delete(userID);
}

/**
 * Get a user from the cache.
 * @param root Named parameters
 * @param root.userID The ID of the user to get from the cache.
 * @returns The user from the cache, or undefined if the user is not in the cache or has expired.
 */
export function getUserFromCache({
  userID,
}: {
  userID: string;
}): undefined | User {
  const user = cache.get(userID);
  if (!user) {
    return undefined;
  }
  if (user.expiration < new Date()) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where -- not Drizzle
    cache.delete(userID);
    return undefined;
  }
  return {
    createdAt: user.createdAt,
    email: user.email,
    id: user.id,
    lastActivity: user.lastActivity,
    updatedAt: user.updatedAt,
  };
}

/**
 * Set a user in the cache.
 * @param root Named parameters
 * @param root.user The user to set in the cache.
 */
export function setUserInCache({ user }: { user: User }): void {
  cache.set(user.id, {
    ...user,
    expiration: new Date(Date.now() + cacheTTL),
  });
}
