import { and, eq } from 'drizzle-orm';
import type { Conversation, Message } from './database-chat-schemas';
import { pgDatabase } from '../config/database-postgresql';
import { conversationsTable, messagesTable } from './database-chat-schemas';

/**
 * Create a new conversation
 * @param root named parameters
 * @param root.spaceID (optional) The ID of the space the conversation belongs to
 * @param root.userID The user ID of the owner of the conversation
 * @returns The created conversation
 */
export async function createConversation({
  spaceID,
  userID,
}: {
  spaceID?: string;
  userID: string;
}): Promise<Conversation> {
  const result = await pgDatabase
    .insert(conversationsTable)
    .values({
      spaceID,
      userID,
    })
    .returning();

  return {
    ...result[0],
    spaceID: result[0].spaceID ?? undefined,
  };
}

/**
 * Delete a conversation by ID
 * @param root named parameters
 * @param root.conversationID The ID of the conversation to delete
 * @param root.userID The user ID of the owner of the conversation
 */
export async function deleteConversation({
  conversationID,
  userID,
}: {
  conversationID: string;
  userID: string;
}): Promise<void> {
  await pgDatabase
    .delete(conversationsTable)
    .where(
      and(
        eq(conversationsTable.conversationID, conversationID),
        eq(conversationsTable.userID, userID),
      ),
    );
}

/**
 * Get a conversation by ID
 * @param root named parameters
 * @param root.conversationID The ID of the conversation to get
 * @param root.userID The user ID of the owner of the conversation
 * @returns The conversation
 */
export async function getConversation({
  conversationID,
  userID,
}: {
  conversationID: string;
  userID: string;
}): Promise<undefined | { conversation: Conversation; messages: Message[] }> {
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

  if (records[0].conversations.userID !== userID) {
    return undefined;
  }

  const conversation = {
    ...records[0].conversations,
    spaceID: records[0].conversations.spaceID ?? undefined,
  };
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
    .map((record) => {
      return {
        conversationID: record.conversations.conversationID,
        createdAt: record.messages.createdAt,
        initiatives: record.messages.initiatives ?? undefined,
        messageID: record.messages.messageID,
        prompt: record.messages.prompt,
        response: record.messages.response ?? undefined,
        sources: record.messages.sources ?? undefined,
        userID: record.conversations.userID,
      } satisfies Message;
    });

  return {
    conversation,
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
  const records = await pgDatabase
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.userID, userID));

  return records.map((record) => {
    return {
      ...record,
      spaceID: record.spaceID ?? undefined,
    };
  });
}
