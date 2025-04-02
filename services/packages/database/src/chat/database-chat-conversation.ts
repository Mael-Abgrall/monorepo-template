import { eq, sql } from 'drizzle-orm';
import type {
  Conversation,
  ConversationWithMessages,
} from './database-chat-schemas';
import { pgDatabase } from '../config/database-postgresql';
import { conversationsTable, messagesTable } from './database-chat-schemas';

/**
 * Create a new conversation
 * @param root named parameters
 * @param root.prompt The prompt for the conversation
 * @param root.title The title of the conversation
 * @param root.userID The user ID of the owner of the conversation
 * @returns The created conversation
 */
export async function createConversation({
  prompt,
  title,
  userID,
}: {
  prompt: string;
  title: string;
  userID: string;
}): Promise<ConversationWithMessages> {
  const result = await pgDatabase.execute<ConversationWithMessages>(sql`
    WITH new_conversation AS (
      INSERT INTO conversations (title, user_id)
      VALUES (${title}, ${userID})
      RETURNING *
    ),
    new_message AS (
      INSERT INTO messages (conversation_id, prompt, user_id)
      SELECT conversation_id, ${prompt}, ${userID}
      FROM new_conversation
      RETURNING *
    )
    SELECT 
      nc.conversation_id AS "conversationID",
      nc.created_at AS "createdAt",
      nc.title,
      nc.user_id AS "userID",
      nc.visibility,
      json_agg(
        json_build_object(
          'messageID', nm.message_id,
          'prompt', nm.prompt,
          'createdAt', nm.created_at
        )
      ) AS messages
    FROM new_conversation nc
    JOIN new_message nm ON nc.conversation_id = nm.conversation_id
    GROUP BY nc.conversation_id, nc.created_at, nc.title, nc.user_id, nc.visibility;
  `);

  return result.rows[0];
}

/**
 * Delete a conversation by ID
 * @param root named parameters
 * @param root.conversationID The ID of the conversation to delete
 */
export async function deleteConversation({
  conversationID,
}: {
  conversationID: string;
}): Promise<void> {
  await pgDatabase
    .delete(conversationsTable)
    .where(eq(conversationsTable.conversationID, conversationID));
}

/**
 * Get a conversation by ID
 * @param root named parameters
 * @param root.conversationID The ID of the conversation to get
 * @returns The conversation
 */
export async function getConversation({
  conversationID,
}: {
  conversationID: string;
}): Promise<ConversationWithMessages | undefined> {
  const records = await pgDatabase
    .select()
    .from(conversationsTable)
    .leftJoin(
      messagesTable,
      eq(conversationsTable.conversationID, messagesTable.conversationID),
    )
    .where(eq(conversationsTable.conversationID, conversationID));

  if (records.length === 0) {
    return undefined;
  }

  const conversation = records[0].conversations;
  const messages = records
    // filter out records with null messages (eg: a conversation with no messages)
    .filter(
      (
        record,
      ): record is typeof record & {
        messages: NonNullable<(typeof record)['messages']>;
      } => {
        return record.messages !== null;
      },
    )
    // replace null by undefined
    .map((record) => {
      return {
        createdAt: record.messages.createdAt,
        initiatives: record.messages.initiatives ?? undefined,
        messageID: record.messages.messageID,
        prompt: record.messages.prompt,
        response: record.messages.response ?? undefined,
        sources: record.messages.sources ?? undefined,
      } satisfies ConversationWithMessages['messages'][number];
    });

  return {
    ...conversation,
    messages,
  };
}

/**
 * List conversations by user ID
 * @param root named parameters
 * @param root.userID The user ID of the owner of the conversations
 * @returns The conversations
 */
export async function listConversations({
  userID,
}: {
  userID: string;
}): Promise<Conversation[]> {
  return pgDatabase
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userID, userID));
}

/**
 * Update a conversation, only the title and visibility can be updated
 * @param root named parameters
 * @param root.conversationID The ID of the conversation to update
 * @param root.title The title of the conversation
 * @param root.visibility The visibility of the conversation
 */
export async function updateConversation({
  conversationID,
  title,
  visibility,
}: {
  conversationID: string;
  title: string | undefined;
  visibility: 'private' | 'public' | undefined;
}): Promise<void> {
  await pgDatabase
    .update(conversationsTable)
    .set({ title, visibility })
    .where(eq(conversationsTable.conversationID, conversationID));
}
