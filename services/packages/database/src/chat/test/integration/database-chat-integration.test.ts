import type { Environment } from 'service-utils/environment';
import { eq } from 'drizzle-orm';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, describe, expect, it } from 'vitest';
import type { LanguageModelMessage } from '../../../../../ai/src/providers/lm/interfaces';
import { pgDatabase } from '../../../config/database-postgresql';
import { createSpace } from '../../../space/database-space';
import {
  createChat,
  getChat,
  listChatsInSpace,
  updateMessagesInChat,
} from '../../database-chat';
import { chatTable } from '../../database-chat-schemas';

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

describe('createChat', () => {
  it('should create a new chat and return it', async () => {
    const userID = crypto.randomUUID();
    const chat = await createChat({ messages: [], spaceID: undefined, userID });

    expect(chat).toBeDefined();
    expect(chat.chatID).toBeDefined();
    expect(chat.userID).toBe(userID);
    expect(chat.spaceID).toBeUndefined();

    const databaseChats = await pgDatabase
      .select()
      .from(chatTable)
      .where(eq(chatTable.chatID, chat.chatID));
    expect(databaseChats.length).toBe(1);
    expect(databaseChats[0].userID).toBe(userID);
  });

  it('should create a chat in a space when spaceID is provided', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({ title: 'Test title', userID });
    const chat = await createChat({
      messages: [],
      spaceID: space.spaceID,
      userID,
    });

    expect(chat).toBeDefined();
    expect(chat.spaceID).toBe(space.spaceID);

    const databaseChats = await pgDatabase
      .select()
      .from(chatTable)
      .where(eq(chatTable.chatID, chat.chatID));
    expect(databaseChats[0].spaceID).toBe(space.spaceID);
  });

  it('should throw if spaceID is invalid', async () => {
    const userID = crypto.randomUUID();
    await expect(
      createChat({ messages: [], spaceID: 'invalid', userID }),
    ).rejects.toThrow();
  });
});

describe('getChat', () => {
  it('should return the chat if the user is the owner and chat exists', async () => {
    const userID = crypto.randomUUID();
    const chat = await createChat({ messages: [], spaceID: undefined, userID });

    const result = await getChat({ chatID: chat.chatID, userID });
    expect(result).toBeDefined();
    expect(result?.chatID).toBe(chat.chatID);
    expect(result?.userID).toBe(userID);
  });

  it('should return undefined if the chat does not exist', async () => {
    const userID = crypto.randomUUID();
    const result = await getChat({ chatID: crypto.randomUUID(), userID });
    expect(result).toBeUndefined();
  });

  it('should return undefined if the user is not the owner', async () => {
    const userID = crypto.randomUUID();
    const chat = await createChat({ messages: [], spaceID: undefined, userID });

    const result = await getChat({
      chatID: chat.chatID,
      userID: crypto.randomUUID(),
    });
    expect(result).toBeUndefined();
  });
});

describe('listChatsInSpace', () => {
  it('should list chats for a given user and space', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({ title: 'Test title', userID });
    // Create two chats for the same user and space
    await createChat({ messages: [], spaceID: space.spaceID, userID });
    await createChat({ messages: [], spaceID: space.spaceID, userID });
    await createChat({ messages: [], spaceID: undefined, userID });
    // Create a chat for another user
    await createChat({
      messages: [],
      spaceID: space.spaceID,
      userID: crypto.randomUUID(),
    });

    const chats = await listChatsInSpace({ spaceID: space.spaceID, userID });
    expect(chats.length).toBe(2);
    for (const chat of chats) {
      expect(chat.userID).toBe(userID);
      expect(chat.spaceID).toBe(space.spaceID);
    }
  });

  it('should return an empty array if no chats exist for the user/space', async () => {
    const userID = crypto.randomUUID();
    const spaceID = crypto.randomUUID();

    const chats = await listChatsInSpace({ spaceID, userID });
    expect(chats.length).toBe(0);
  });
});

describe('updateMessagesInChat', () => {
  it('should update messages in a chat', async () => {
    const userID = crypto.randomUUID();
    const chat = await createChat({ messages: [], spaceID: undefined, userID });

    const messages: LanguageModelMessage[] = [
      { content: [{ text: 'Hello' }], role: 'user' },
      { content: [{ text: 'Hi!' }], role: 'assistant' },
    ];

    const updatedChat = await updateMessagesInChat({
      chatID: chat.chatID,
      messages,
      userID,
    });
    expect(updatedChat).toBeDefined();
    expect(updatedChat.chatID).toBe(chat.chatID);

    // Check DB state
    const databaseChats = await pgDatabase
      .select()
      .from(chatTable)
      .where(eq(chatTable.chatID, chat.chatID));
    expect(databaseChats.length).toBe(1);
    expect(databaseChats[0].messages).toEqual(messages);
    expect(
      new Date(databaseChats[0].updatedAt).getTime(),
    ).toBeGreaterThanOrEqual(new Date(chat.createdAt).getTime());
  });

  it('should throw if chat does not exist', async () => {
    const fakeID = crypto.randomUUID();
    await expect(
      updateMessagesInChat({
        chatID: fakeID,
        messages: [],
        userID: crypto.randomUUID(),
      }),
    ).rejects.toThrow();
  });

  it('should throw if another user is trying to update a chat', async () => {
    const userID = crypto.randomUUID();
    const chat = await createChat({ messages: [], spaceID: undefined, userID });
    const anotherUserID = crypto.randomUUID();

    await expect(
      updateMessagesInChat({
        chatID: chat.chatID,
        messages: [{ content: [{ text: 'Hello' }], role: 'user' }],
        userID: anotherUserID,
      }),
    ).rejects.toThrow();
  });
});
