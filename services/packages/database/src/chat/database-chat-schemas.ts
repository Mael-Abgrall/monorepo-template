import type { InferInsertModel } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { NullToUndefined } from '../database-drizzle-null';

export const conversationsTable = pgTable('conversations', {
  conversationID: uuid('conversation_id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  title: text('title').notNull(),
  userID: uuid('user_id').notNull(),
  visibility: text('visibility', { enum: ['private', 'public'] })
    .notNull()
    .default('private'),
});
type ChatInitiative =
  | undefined
  | {
      action: string;
    }[];
type ChatSources =
  | undefined
  | {
      chunk: string;
      chunkID: string;
      documentID: string;
      origin: string;
      title: string;
      url: string;
    }[];

/* v8 ignore start -- The onDelete is not picked up, but this doesn't need to be tested */
export const messagesTable = pgTable('messages', {
  conversationID: uuid('conversation_id')
    .references(
      () => {
        return conversationsTable.conversationID;
      },
      { onDelete: 'cascade' },
    )
    .notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  initiatives: jsonb('initiatives').$type<ChatInitiative>(),
  messageID: uuid('message_id').primaryKey().defaultRandom(),
  prompt: text('prompt').notNull(),
  response: text('response'),
  sources: jsonb('sources').$type<ChatSources>(),
  userID: uuid('user_id').notNull(),
});
/* v8 ignore end */

export type Conversation = NullToUndefined<
  typeof conversationsTable.$inferSelect
>;
export type Message = NullToUndefined<typeof messagesTable.$inferSelect>;
export type NewConversation = InferInsertModel<typeof conversationsTable>;
export type NewMessage = InferInsertModel<typeof messagesTable>;
