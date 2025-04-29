import { jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { LanguageModelMessage } from '../../../ai/src/providers/lm/interfaces';
import type { NullToUndefined } from '../database-drizzle-null';
import { spaceTable } from '../space/database-space-schemas';

export const chatTable = pgTable('chats', {
  chatID: uuid('chat_id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  messages: jsonb('messages').$type<LanguageModelMessage[]>().notNull(),
  /* v8 ignore start -- no need to test this */
  spaceID: uuid('space_id').references(() => {
    return spaceTable.spaceID;
  }),
  /* v8 ignore end */
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  userID: uuid('user_id').notNull(),
});
export type ChatInDB = NullToUndefined<typeof chatTable.$inferSelect>;
