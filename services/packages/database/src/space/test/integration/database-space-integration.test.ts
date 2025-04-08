import { describe, expect, it } from 'vitest';
import { createSpace } from '../../database-space';

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
