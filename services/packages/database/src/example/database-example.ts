import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq } from 'drizzle-orm';
import type { Item } from '../database-pg-schema.js';
import { itemsTable } from '../database-pg-schema.js';

/**
 * Insert an item in the database
 * @param root named parameters
 * @param root.name name of the item
 * @param root.pgDatabase database instance
 * @returns the id of the created or updated item
 */
export async function addItem({
  name,
  pgDatabase,
}: {
  name: string;
  pgDatabase: NeonHttpDatabase;
}): Promise<string> {
  const result = await pgDatabase
    .insert(itemsTable)
    .values({
      name,
    })
    .returning({ id: itemsTable.id });

  return result[0].id;
}

/**
 * Get an item from the database
 * @param root named parameters
 * @param root.id id of the item
 * @param root.pgDatabase database instance
 * @returns the item, or undefined if not found
 */
export async function getItem({
  id,
  pgDatabase,
}: {
  id: string;
  pgDatabase: NeonHttpDatabase;
}): Promise<Item | undefined> {
  const result = await pgDatabase
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.id, id));

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update an item from the database. Will ignore and not update undefined fields
 * @param root named parameters
 * @param root.id id of the item
 * @param root.name name of the item
 * @param root.pgDatabase database instance
 * @param root.quantity quantity of the item
 * @returns the updated item
 */
export async function updateItem({
  id,
  name,
  pgDatabase,
  quantity,
}: {
  id: string;
  name?: string;
  pgDatabase: NeonHttpDatabase;
  quantity?: number;
}): Promise<Item> {
  const updatedFields: Partial<Item> = {};

  if (name !== undefined) {
    updatedFields.name = name;
  }

  if (quantity !== undefined) {
    updatedFields.quantity = quantity;
  }

  const result = await pgDatabase
    .update(itemsTable)
    .set(updatedFields)
    .where(eq(itemsTable.id, id))
    .returning();

  if (result.length === 0) {
    throw new Error(`Item with ID ${id} not found`);
  }

  return result[0];
}
