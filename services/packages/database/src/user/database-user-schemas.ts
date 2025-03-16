import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users', {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  email: text('email').notNull().unique(),
  id: uuid('id').primaryKey().defaultRandom(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  userName: text('user_name').notNull(),
});

export type NewUser = InferInsertModel<typeof usersTable>;
export type User = InferSelectModel<typeof usersTable>;
