import { describe, expect, it, vi } from 'vitest';
import type { NewUser, User } from '../../database-user-schemas';
import * as databaseOperations from '../../database-user';
import * as cacheOperations from '../../database-user-cache';
import { createUser, getUser } from '../../database-user-interface';

const mockUser = {
  email: 'mock@example.com',
  id: '123',
} satisfies NewUser;
const mockCreatedUser = {
  ...mockUser,
  createdAt: new Date(),
  lastActivity: new Date(),
  updatedAt: new Date(),
} satisfies User;

vi.mock('../../database-user');
vi.mock('../../database-user-cache');
const insertUserMock = vi.mocked(databaseOperations.insertUser);
const setUserInCacheMock = vi.mocked(cacheOperations.setUserInCache);
const getUserFromCacheMock = vi.mocked(cacheOperations.getUserFromCache);
const getUserByIdMock = vi.mocked(databaseOperations.getUserById);

describe('createUser', () => {
  it('should save the user to the database then cache it', async () => {
    insertUserMock.mockResolvedValueOnce(mockCreatedUser);
    setUserInCacheMock.mockImplementationOnce(() => {
      return;
    });

    const result = await createUser({ user: mockUser });

    expect(insertUserMock).toHaveBeenCalledWith({ user: mockUser });
    expect(setUserInCacheMock).toHaveBeenCalledWith({
      user: mockCreatedUser,
    });
    expect(insertUserMock).toHaveBeenCalledBefore(setUserInCacheMock);
    expect(result).toEqual(mockCreatedUser);
  });
});

describe('getUser', () => {
  it('should return user from cache if available', async () => {
    getUserFromCacheMock.mockReturnValueOnce(mockCreatedUser);

    const result = await getUser({ userID: '123' });

    expect(getUserFromCacheMock).toHaveBeenCalledWith({ userID: '123' });
    expect(getUserByIdMock).not.toHaveBeenCalled();
    expect(result).toEqual(mockCreatedUser);
  });

  it('should fetch from database and update cache if not in cache', async () => {
    getUserFromCacheMock.mockReturnValueOnce(undefined);
    getUserByIdMock.mockResolvedValueOnce(mockCreatedUser);

    const result = await getUser({ userID: '123' });

    expect(getUserFromCacheMock).toHaveBeenCalledWith({ userID: '123' });
    expect(getUserByIdMock).toHaveBeenCalledWith({ id: '123' });
    expect(setUserInCacheMock).toHaveBeenCalledWith({
      user: mockCreatedUser,
    });
    expect(result).toEqual(mockCreatedUser);
  });

  it('should return undefined if user does not exist', async () => {
    getUserFromCacheMock.mockReturnValueOnce(undefined);
    getUserByIdMock.mockResolvedValueOnce(undefined);

    const result = await getUser({ userID: '123' });

    expect(getUserFromCacheMock).toHaveBeenCalledWith({ userID: '123' });
    expect(getUserByIdMock).toHaveBeenCalledWith({ id: '123' });
    expect(setUserInCacheMock).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});
