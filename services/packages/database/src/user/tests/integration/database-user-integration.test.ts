import { describe, expect, it } from 'vitest';
import { pgDatabase } from '../../../database-pg';
import { createUser, getUserByEmail, getUserById } from '../../database-user';
import { usersTable } from '../../database-user-schemas';

describe('createUser', () => {
  it('should create a user in the database, and return the created user', async () => {
    const userIn = {
      email: 'integration-test@example.com',
      userName: 'Integration Test',
    };

    const createdUser = await createUser({ user: userIn });

    expect(createdUser).toHaveProperty('id');
    expect(createdUser.email).toBe(userIn.email);
    expect(createdUser.userName).toBe(userIn.userName);
    expect(createdUser).toHaveProperty('createdAt');
    expect(createdUser).toHaveProperty('updatedAt');

    const records = await pgDatabase.select().from(usersTable);
    expect(records).toHaveLength(1);
    expect(records[0].email).toBe(userIn.email);
    expect(records[0].userName).toBe(userIn.userName);
  });

  it('should throw an error if the user already exists', async () => {
    const userIn = {
      email: 'integration-test@example.com',
      userName: 'Integration Test',
    };

    await createUser({ user: userIn });
    await expect(createUser({ user: userIn })).rejects.toThrow();
  });
});

describe('getUserByEmail', () => {
  it('should retrieve a user by email', async () => {
    const userData = {
      email: 'get-by-email@example.com',
      userName: 'Get By Email',
    };

    await createUser({ user: userData });
    const retrievedUser = await getUserByEmail({ email: userData.email });

    expect(retrievedUser).not.toBeUndefined();
    expect(retrievedUser?.email).toBe(userData.email);
  });

  it('should return undefined for non-existent email', async () => {
    const nonExistentUser = await getUserByEmail({
      email: 'nonexistent@example.com',
    });
    expect(nonExistentUser).toBeUndefined();
  });
});

describe('getUserById', () => {
  it('should retrieve a user by ID', async () => {
    const userData = {
      email: 'get-by-id@example.com',
      userName: 'Get By Id',
    };

    const createdUser = await createUser({ user: userData });
    const retrievedUser = await getUserById({ id: createdUser.id });

    expect(retrievedUser).not.toBeUndefined();
    expect(retrievedUser?.id).toBe(createdUser.id);
    expect(retrievedUser?.email).toBe(userData.email);
  });

  it('should return undefined for non-existent ID', async () => {
    const nonExistentUser = await getUserById({ id: crypto.randomUUID() });
    expect(nonExistentUser).toBeUndefined();
  });
});
