import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { NullToUndefined } from '../database-drizzle-null';

export const spaceTable = pgTable('spaces', {
  createdAt: timestamp('created_at').notNull().defaultNow(),
  spaceID: uuid('space_id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  userID: uuid('user_id').notNull(),
  visibility: text('visibility', { enum: ['private', 'public'] })
    .notNull()
    .default('private'),
});
export type Space = NullToUndefined<typeof spaceTable.$inferSelect>;
