import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { pgDatabase } from '../../../config/database-postgresql';
import {
  createSpace,
  deleteSpace,
  listSpaces,
  updateSpace,
} from '../../database-space';
import { spaceTable } from '../../database-space-schemas';

describe('createSpace', () => {
  it('should create a new space, generate an ID, and default to private', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({
      title: 'Test title',
      userID,
    });
    expect(space).toBeDefined();
    expect(space.spaceID).toBeDefined();
    expect(space.spaceID.length).toBeGreaterThanOrEqual(36);
    expect(space.createdAt).toBeDefined();
    expect(space.title).toBe('Test title');
    expect(space.userID).toBe(userID);
    expect(space.visibility).toBe('private');
  });
});

describe('deleteSpace', () => {
  it('should delete a space', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({
      title: 'Test title',
      userID,
    });
    await deleteSpace({ spaceID: space.spaceID, userID });

    const result = await pgDatabase
      .select()
      .from(spaceTable)
      .where(eq(spaceTable.spaceID, space.spaceID));
    expect(result).toHaveLength(0);
  });

  it('should not delete the space of another user', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({
      title: 'Test title',
      userID,
    });
    await deleteSpace({ spaceID: space.spaceID, userID: crypto.randomUUID() });

    const result = await pgDatabase
      .select()
      .from(spaceTable)
      .where(eq(spaceTable.spaceID, space.spaceID));
    expect(result).toHaveLength(1);
  });
});

describe('listSpaces', () => {
  it('should list all spaces of a user', async () => {
    const userID = crypto.randomUUID();
    const space1 = await createSpace({
      title: 'Test title 1',
      userID,
    });
    const space2 = await createSpace({
      title: 'Test title 2',
      userID,
    });

    const result = await listSpaces({ userID });
    expect(result).toHaveLength(2);
    expect(result).toContainEqual(space1);
    expect(result).toContainEqual(space2);
  });
});

describe('updateSpace', () => {
  it('should update a space', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({
      title: 'Test title',
      userID,
    });
    await updateSpace({
      spaceID: space.spaceID,
      title: 'Updated title',
      userID,
      visibility: 'public',
    });

    const updatedSpace = await pgDatabase
      .select()
      .from(spaceTable)
      .where(eq(spaceTable.spaceID, space.spaceID));
    expect(updatedSpace).toHaveLength(1);
    expect(updatedSpace[0].title).toBe('Updated title');
    expect(updatedSpace[0].visibility).toBe('public');
  });

  it('should not update the space of another user', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({
      title: 'Test title',
      userID,
    });
    await updateSpace({
      spaceID: space.spaceID,
      title: 'Updated title',
      userID: crypto.randomUUID(),
      visibility: 'public',
    });

    const result = await pgDatabase
      .select()
      .from(spaceTable)
      .where(eq(spaceTable.spaceID, space.spaceID));
    expect(result).toHaveLength(1);
  });

  it('should ignore undefined fields', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({
      title: 'Test title',
      userID,
    });
    await updateSpace({
      spaceID: space.spaceID,
      title: 'Updated title',
      userID,
      visibility: undefined,
    });

    const firstUpdate = await pgDatabase
      .select()
      .from(spaceTable)
      .where(eq(spaceTable.spaceID, space.spaceID));
    expect(firstUpdate).toHaveLength(1);
    expect(firstUpdate[0].title).toBe('Updated title');
    expect(firstUpdate[0].visibility).toBe('private');

    await updateSpace({
      spaceID: space.spaceID,
      title: undefined,
      userID,
      visibility: 'public',
    });

    const secondUpdate = await pgDatabase
      .select()
      .from(spaceTable)
      .where(eq(spaceTable.spaceID, space.spaceID));
    expect(secondUpdate).toHaveLength(1);
    expect(secondUpdate[0].title).toBe('Updated title');
    expect(secondUpdate[0].visibility).toBe('public');
  });
});
