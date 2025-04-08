import { describe, expect, it } from 'vitest';
import { pgDatabase } from '../../../config/database-postgresql';
import { createSpace } from '../../../space/database-space';
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from '../../database-chat-conversation';
import { createMessage } from '../../database-chat-message';
import { messagesTable } from '../../database-chat-schemas';

describe('createConversation', () => {
  it('should create a new conversation, and return it and the first message', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      userID,
    });

    expect(conversation).toBeDefined();
    expect(conversation.conversationID).toBeDefined();
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.userID).toBe(userID);
  });

  it('should allow to create a conversation in a space when a spaceID is given', async () => {
    const userID = crypto.randomUUID();
    const space = await createSpace({
      title: 'Test title',
      userID,
    });

    const conversation = await createConversation({
      spaceID: space.spaceID,
      userID,
    });

    expect(conversation).toBeDefined();
    expect(conversation.conversationID).toBeDefined();
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.spaceID).toBe(space.spaceID);
    expect(conversation.userID).toBe(userID);
  });

  it('should not allow to create a conversation in a space that does not exist', async () => {
    const spaceID = crypto.randomUUID();
    const userID = crypto.randomUUID();
    await expect(
      createConversation({
        spaceID,
        userID,
      }),
    ).rejects.toThrow();
  });
});

describe('getConversation', () => {
  it('should get a conversation by ID, with all the associated messages', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      userID,
    });

    await createMessage({
      conversationID: createdConversation.conversationID,
      prompt: 'A message',
      userID,
    });
    await createMessage({
      conversationID: createdConversation.conversationID,
      prompt: 'Another message',
      userID,
    });

    const pulledConversation = await getConversation({
      conversationID: createdConversation.conversationID,
      userID,
    });
    expect(pulledConversation).toBeDefined();
    expect(pulledConversation?.messages).toBeDefined();
    expect(pulledConversation?.messages.length).toBe(2);
    expect(pulledConversation?.messages[0].prompt).toBe('A message');
    expect(pulledConversation?.messages[1].prompt).toBe('Another message');
  });

  it('should return undefined when the user is not the owner, and the conversation private', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      userID,
    });

    const pulledConversation = await getConversation({
      conversationID: createdConversation.conversationID,
      userID: crypto.randomUUID(),
    });
    expect(pulledConversation).toBeUndefined();
  });
});

describe('deleteConversation', () => {
  it('should delete a conversation by ID, and all the messages in it', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      userID,
    });
    await createMessage({
      conversationID: createdConversation.conversationID,
      prompt: 'A message',
      userID,
    });
    await createMessage({
      conversationID: createdConversation.conversationID,
      prompt: 'Another message',
      userID,
    });

    const pulledConversation = await getConversation({
      conversationID: createdConversation.conversationID,
      userID,
    });
    expect(pulledConversation).toBeDefined();

    await deleteConversation({
      conversationID: createdConversation.conversationID,
      userID,
    });
    const pulledConversationAfterDelete = await getConversation({
      conversationID: createdConversation.conversationID,
      userID,
    });
    expect(pulledConversationAfterDelete).toBeUndefined();

    const messagesAfterDelete = await pgDatabase.select().from(messagesTable);
    expect(messagesAfterDelete.length).toBe(0);
  });

  it('should not delete someone else conversation', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      userID,
    });
    await deleteConversation({
      conversationID: createdConversation.conversationID,
      userID: crypto.randomUUID(),
    });
    const pulledConversation = await getConversation({
      conversationID: createdConversation.conversationID,
      userID,
    });
    expect(pulledConversation).toBeDefined();
  });
});

describe('listConversations', () => {
  it('should list conversations by user ID', async () => {
    const userID = crypto.randomUUID();
    await createConversation({
      userID,
    });
    await createConversation({
      userID,
    });

    const conversations = await listConversations({
      userID,
    });

    expect(conversations).toBeDefined();
    expect(conversations.length).toBe(2);
  });

  it('should not return conversations for other users', async () => {
    const userID = crypto.randomUUID();
    const userID2 = crypto.randomUUID();
    const user1Conversation = await createConversation({
      userID,
    });

    const conversations = await listConversations({
      userID: userID2,
    });
    const pulledConversation = await getConversation({
      conversationID: user1Conversation.conversationID,
      userID,
    });

    expect(conversations).toBeDefined();
    expect(conversations.length).toBe(0);
    expect(pulledConversation).toBeDefined();
  });
});
