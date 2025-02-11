import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { itemsTable } from '../../../database-pg-schema.js';
import { getPostgreSQL } from '../../../database-pg.js';
import { addItem, getItem, updateItem } from '../../database-example.js';

let database: NeonHttpDatabase;

beforeAll(async () => {
  database = await getPostgreSQL({
    env: process.env,
  });
});

beforeEach(async () => {
  await database.execute(sql`TRUNCATE TABLE items CASCADE`);
});

describe('addItem', () => {
  it('should create a new item', async () => {
    const id = await addItem({
      name: 'New Item',
      pgDatabase: database,
    });

    expect(id).toBeDefined();
    const rows = await database.select().from(itemsTable);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('New Item');
  });
});

describe('getItem', () => {
  it('should return the item when it exists', async () => {
    // First create an item
    const id = await addItem({
      name: 'Item to Get',
      pgDatabase: database,
    });

    // Then retrieve it
    const item = await getItem({
      id,
      pgDatabase: database,
    });

    expect(item).toBeDefined();
    expect(item?.id).toBe(id);
    expect(item?.name).toBe('Item to Get');
    expect(item?.quantity).toBe(0);
  });

  it('should return undefined when item does not exist', async () => {
    const item = await getItem({
      id: randomUUID(),
      pgDatabase: database,
    });

    expect(item).toBeUndefined();
  });
});

describe('updateItem', () => {
  it('should update an existing item', async () => {
    const id = await addItem({
      name: 'Original Item',
      pgDatabase: database,
    });
    const updatedItem = await updateItem({
      id,
      name: 'Updated Item',
      pgDatabase: database,
      quantity: 1,
    });

    expect(updatedItem).toBeDefined();
    expect(updatedItem.id).toBe(id);
    expect(updatedItem.name).toBe('Updated Item');
    expect(updatedItem.quantity).toBe(1);
  });

  it('should ignore undefined fields during update', async () => {
    const id = await addItem({
      name: 'Item to Update',
      pgDatabase: database,
    });
    const updatedItem = await updateItem({
      id,
      name: undefined,
      pgDatabase: database,
      quantity: 1,
    });

    expect(updatedItem).toBeDefined();
    expect(updatedItem.id).toBe(id);
    expect(updatedItem.name).toBe('Item to Update');
    expect(updatedItem.quantity).toBe(1);
  });

  it('should handle non-existent ID errors', async () => {
    await expect(
      updateItem({
        id: randomUUID(),
        name: 'Non-Existent Item',
        pgDatabase: database,
      }),
    ).rejects.toThrow();
  });
});
