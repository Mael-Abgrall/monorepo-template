import { eq } from 'drizzle-orm';
import type { Conversation } from './database-chat-schemas';
import { pgDatabase } from '../config/database-postgresql';
import { conversationsTable } from './database-chat-schemas';

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
}): Promise<Conversation> {
  const conversation = await pgDatabase
    .insert(conversationsTable)
    .values({
      messages: [{ createdAt: new Date().toISOString(), prompt }],
      title,
      userID,
    })
    .returning();
  return conversation[0];
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
}): Promise<Conversation> {
  const record = await pgDatabase
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.conversationID, conversationID));
  return record[0];
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

// updates:
// - add a message to a conversation
// - delete a message from a conversation
// - update a message in a conversation // won't do for now
// - update the title of a conversation
// - update the visibility of a conversation
