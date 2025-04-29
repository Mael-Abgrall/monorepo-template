import { and, eq } from 'drizzle-orm';
import { getContextLogger } from 'service-utils/logger';
import type { LanguageModelMessage } from '../../../ai/src/providers/lm/interfaces';
import type { ChatInDB } from './database-chat-schemas';
import { pgDatabase } from '../config/database-postgresql';
import { chatTable } from './database-chat-schemas';

const logger = getContextLogger('database-chat.ts');

/**
 * Create a new chat
 * @param root named parameters
 * @param root.messages The initial messages of the chat
 * @param root.spaceID (optional) The ID of the space the chat belongs to
 * @param root.userID The user ID of the owner of the chat
 * @returns The created chat
 */
export async function createChat({
  messages,
  spaceID,
  userID,
}: {
  messages: LanguageModelMessage[];
  spaceID: string | undefined;
  userID: string;
}): Promise<ChatInDB> {
  const record = await pgDatabase
    .insert(chatTable)
    .values({
      messages,
      spaceID,
      userID,
    })
    .returning();

  logger.info({ chatID: record[0].chatID, spaceID, userID }, 'createChat');

  return {
    ...record[0],
    spaceID: record[0].spaceID ?? undefined,
  };
}

/**
 * Get a chat from the DB
 * @param root named parameters
 * @param root.chatID The ID of the chat
 * @param root.userID The user ID of the owner of the chat
 * @returns The chat
 */
export async function getChat({
  chatID,
  userID,
}: {
  chatID: string;
  userID: string;
}): Promise<ChatInDB | undefined> {
  const record = await pgDatabase
    .select()
    .from(chatTable)
    .where(and(eq(chatTable.chatID, chatID), eq(chatTable.userID, userID)));

  logger.info({ chatID, userID }, 'getChat');

  return record[0]
    ? {
        ...record[0],
        spaceID: record[0].spaceID ?? undefined,
      }
    : undefined;
}

/**
 * List chats in a space
 * @param root named parameters
 * @param root.spaceID The ID of the space the chat belongs to
 * @param root.userID The user ID of the owner of the chat
 * @returns The chats
 */
export async function listChatsInSpace({
  spaceID,
  userID,
}: {
  spaceID: string;
  userID: string;
}): Promise<ChatInDB[]> {
  const records = await pgDatabase
    .select()
    .from(chatTable)
    .where(and(eq(chatTable.spaceID, spaceID), eq(chatTable.userID, userID)));

  logger.info({ spaceID, userID }, 'listChatsInSpace');

  return records.map((record) => {
    return {
      ...record,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- this will always be defined here
      spaceID: record.spaceID!,
    };
  });
}

/**
 * Update the messages in a chat
 * @param root named parameters
 * @param root.chatID The ID of the chat to update
 * @param root.messages The new messages to set
 * @param root.userID The user ID of the owner of the chat
 * @returns The updated chat
 */
export async function updateMessagesInChat({
  chatID,
  messages,
  userID,
}: {
  chatID: string;
  messages: LanguageModelMessage[];
  userID: string;
}): Promise<ChatInDB> {
  const record = await pgDatabase
    .update(chatTable)
    .set({
      messages,
      updatedAt: new Date(),
    })
    .where(and(eq(chatTable.chatID, chatID), eq(chatTable.userID, userID)))
    .returning();

  logger.info({ chatID, userID }, 'updateMessagesInChat');

  if (record.length === 0) {
    throw new Error('Chat not found');
  }

  return {
    ...record[0],
    spaceID: record[0].spaceID ?? undefined,
  };
}
