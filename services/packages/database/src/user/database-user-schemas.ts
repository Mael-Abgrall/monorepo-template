import type { InferInsertModel, InferSelectModel } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { NullToUndefined } from '../database-drizzle-null';

export const usersTable = pgTable('users', {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  email: text('email').notNull().unique(),
  id: uuid('id').primaryKey(),
  lastActivity: timestamp('last_activity').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type NewUser = InferInsertModel<typeof usersTable>;
export type User = InferSelectModel<typeof usersTable>;

export const verificationTokensTable = pgTable('verification_tokens', {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  email: text('email').notNull(),
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().unique(),
  userID: uuid('user_id'),
});
export type NewVerificationRecord = InferInsertModel<
  typeof verificationTokensTable
>;
export type VerificationRecord = NullToUndefined<
  typeof verificationTokensTable.$inferSelect
>;
