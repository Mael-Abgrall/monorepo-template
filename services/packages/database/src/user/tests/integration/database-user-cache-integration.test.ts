import { describe, expect, it, vi } from 'vitest';
import type { User } from '../../database-user-schemas';
import {
  deleteUserFromCache,
  getUserFromCache,
  setUserInCache,
} from '../../database-user-cache';

const user = {
  createdAt: new Date(),
  email: 'test@test.com',
  id: '1',
  lastActivity: new Date(),
  updatedAt: new Date(),
} satisfies User;

describe('setUserInCache', () => {
  it('should set the user in the cache', () => {
    setUserInCache({ user });
    const cachedUser = getUserFromCache({ userID: '1' });
    expect(cachedUser).toBeDefined();
    expect(cachedUser).toStrictEqual(user);
    // @ts-expect-error -- expiration should NOT be returned
    expect(cachedUser?.expiration).toBeUndefined();
  });
});

describe('getUserFromCache', () => {
  it('should return the user from the cache', () => {
    const user = getUserFromCache({ userID: '1' });
    expect(user).toStrictEqual(user);
  });

  it('should return undefined if the user is not in the cache', () => {
    deleteUserFromCache({ userID: '1' });
    const user = getUserFromCache({ userID: '1' });
    expect(user).toBeUndefined();
  });

  it('should return undefined if the user is expired', () => {
    setUserInCache({ user });
    vi.useFakeTimers();
    vi.advanceTimersByTime(1000 * 60 * 60 * 24); // add 24 hours
    const cachedUser = getUserFromCache({ userID: '1' });
    expect(cachedUser).toBeUndefined();
  });
});
