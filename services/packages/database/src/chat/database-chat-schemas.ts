import type { InferInsertModel } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { NullToUndefined } from '../database-drizzle-null';
import { spaceTable } from '../space/database-space-schemas';

export const conversationsTable = pgTable('conversations', {
  conversationID: uuid('conversation_id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  spaceID: uuid('space_id').references(() => {
    return spaceTable.spaceID;
  }),
  userID: uuid('user_id').notNull(),
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
