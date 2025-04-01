import type { InferInsertModel } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { NullToUndefined } from '../database-drizzle-null';

interface ChatMessage {
  createdAt: string;
  initiatives?: {
    action: string;
  }[];
  prompt: string;
  response?: string;
  sources?: {
    chunk: string;
    chunkID: string;
    documentID: string;
    origin: string;
    title: string;
    url: string;
  }[];
}

export const conversationsTable = pgTable('conversations', {
  conversationID: uuid('conversation_id').primaryKey().defaultRandom(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  messages: jsonb('messages').notNull().$type<ChatMessage[]>(),
  title: text('title').notNull(),
  userID: uuid('user_id').notNull(),
  visibility: text('visibility', { enum: ['private', 'public'] })
    .notNull()
    .default('private'),
});

export type Conversation = NullToUndefined<
  typeof conversationsTable.$inferSelect
>;
export type NewConversation = InferInsertModel<typeof conversationsTable>;
