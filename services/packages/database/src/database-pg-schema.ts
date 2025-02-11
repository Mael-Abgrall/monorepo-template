import type { InferSelectModel } from 'drizzle-orm';
import { integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const itemsTable = pgTable('items', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  quantity: integer().notNull().default(0),
});
export type Item = InferSelectModel<typeof itemsTable>;
