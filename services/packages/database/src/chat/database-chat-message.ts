import { and, eq } from 'drizzle-orm';
import type { Message } from './database-chat-schemas';
import { pgDatabase } from '../config/database-postgresql';
import { messagesTable } from './database-chat-schemas';

/**
 * Create a new message in a conversation
 * @param root named parameters
 * @param root.conversationID The conversation ID
 * @param root.prompt The prompt for the message
 * @param root.userID The user ID
 * @returns The created message
 */
export async function createMessage({
  conversationID,
  prompt,
  userID,
}: {
  conversationID: string;
  prompt: string;
  userID: string;
}): Promise<Message> {
  const result = await pgDatabase
    .insert(messagesTable)
    .values({
      conversationID,
      prompt,
      userID,
    })
    .returning();

  return {
    conversationID: result[0].conversationID,
    createdAt: result[0].createdAt,
    initiatives: undefined,
    messageID: result[0].messageID,
    prompt: result[0].prompt,
    response: undefined,
    sources: undefined,
    userID,
  };
}

/**
 * Delete a message from a conversation
 * @param root named parameters
 * @param root.messageID The message ID
 * @param root.userID The user ID
 */
export async function deleteMessage({
  messageID,
  userID,
}: {
  messageID: string;
  userID: string;
}): Promise<void> {
  await pgDatabase
    .delete(messagesTable)
    .where(
      and(
        eq(messagesTable.messageID, messageID),
        eq(messagesTable.userID, userID),
      ),
    );
}

/**
 * Update a message in a conversation. Leave the fields empty to not update them.
 * @param root named parameters
 * @param root.initiatives The initiatives for the message
 * @param root.messageID The message ID
 * @param root.prompt The prompt for the message
 * @param root.response The response for the message
 * @param root.sources The sources for the message
 * @param root.userID The user ID
 */
export async function updateMessage({
  initiatives,
  messageID,
  prompt,
  response,
  sources,
  userID,
}: {
  initiatives?: Message['initiatives'];
  messageID: string;
  prompt?: Message['prompt'];
  response?: Message['response'];
  sources?: Message['sources'];
  userID: string;
}): Promise<void> {
  await pgDatabase
    .update(messagesTable)
    .set({
      initiatives,
      prompt,
      response,
      sources,
    })
    .where(
      and(
        eq(messagesTable.messageID, messageID),
        eq(messagesTable.userID, userID),
      ),
    );
}
