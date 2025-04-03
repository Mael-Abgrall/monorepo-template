import { describe, expect, it } from 'vitest';
import { pgDatabase } from '../../../config/database-postgresql';
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  updateConversation,
} from '../../database-chat-conversation';
import { createMessage } from '../../database-chat-message';
import { messagesTable } from '../../database-chat-schemas';

describe('createConversation', () => {
  it('should create a new conversation, and return it and the first message', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      title: 'Moon Capital',
      userID,
    });

    expect(conversation).toBeDefined();
    expect(conversation.conversationID).toBeDefined();
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.userID).toBe(userID);
    expect(conversation.visibility).toBe('private');
  });
});

describe('getConversation', () => {
  it('should get a conversation by ID, with all the associated messages', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      title: 'Test title',
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
    });
    expect(pulledConversation).toBeDefined();
    expect(pulledConversation?.messages).toBeDefined();
    expect(pulledConversation?.messages.length).toBe(2);
    expect(pulledConversation?.messages[0].prompt).toBe('A message');
    expect(pulledConversation?.messages[1].prompt).toBe('Another message');
  });
});

describe('deleteConversation', () => {
  it('should delete a conversation by ID, and all the messages in it', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      title: 'test title',
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
    });
    expect(pulledConversation).toBeDefined();

    await deleteConversation({
      conversationID: createdConversation.conversationID,
    });
    const pulledConversationAfterDelete = await getConversation({
      conversationID: createdConversation.conversationID,
    });
    expect(pulledConversationAfterDelete).toBeUndefined();

    const messagesAfterDelete = await pgDatabase.select().from(messagesTable);
    expect(messagesAfterDelete.length).toBe(0);
  });
});

describe('listConversations', () => {
  it('should list conversations by user ID', async () => {
    const userID = crypto.randomUUID();
    await createConversation({
      title: 'Test title',
      userID,
    });
    await createConversation({
      title: 'Test second conversation',
      userID,
    });

    const conversations = await listConversations({
      userID,
    });

    expect(conversations).toBeDefined();
    expect(conversations.length).toBe(2);
    expect(conversations[0].title).toBe('Test title');
    expect(conversations[1].title).toBe('Test second conversation');
  });

  it('should not return conversations for other users', async () => {
    const userID = crypto.randomUUID();
    const userID2 = crypto.randomUUID();
    const user1Conversation = await createConversation({
      title: 'Test title',
      userID,
    });

    const conversations = await listConversations({
      userID: userID2,
    });
    const pulledConversation = await getConversation({
      conversationID: user1Conversation.conversationID,
    });

    expect(conversations).toBeDefined();
    expect(conversations.length).toBe(0);
    expect(pulledConversation).toBeDefined();
  });
});

describe('updateConversation', () => {
  it('should update a conversation with a new title and visibility', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      title: 'Test title',
      userID,
    });

    const conversationInDB = await getConversation({
      conversationID: createdConversation.conversationID,
    });
    if (!conversationInDB) {
      throw new Error('Conversation not found');
    }
    expect(conversationInDB.conversation.title).toBe('Test title');
    expect(conversationInDB.conversation.visibility).toBe('private');

    await updateConversation({
      conversationID: createdConversation.conversationID,
      title: 'New Title',
      visibility: 'public',
    });

    const updatedConversation = await getConversation({
      conversationID: createdConversation.conversationID,
    });
    if (!updatedConversation) {
      throw new Error('Conversation not found');
    }
    expect(updatedConversation.conversation.title).toBe('New Title');
    expect(updatedConversation.conversation.visibility).toBe('public');
  });

  it('should not update undefined values', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      title: 'Test title',
      userID,
    });
    const conversationInDB = await getConversation({
      conversationID: createdConversation.conversationID,
    });
    if (!conversationInDB) {
      throw new Error('Conversation not found');
    }
    expect(conversationInDB.conversation.title).toBe('Test title');
    expect(conversationInDB.conversation.visibility).toBe('private');

    await updateConversation({
      conversationID: createdConversation.conversationID,
      title: 'New Title',
      visibility: undefined,
    });

    const updatedConversation = await getConversation({
      conversationID: createdConversation.conversationID,
    });
    if (!updatedConversation) {
      throw new Error('Conversation not found');
    }

    expect(updatedConversation.conversation.title).toBe('New Title');
    expect(updatedConversation.conversation.visibility).toBe('private');

    await updateConversation({
      conversationID: createdConversation.conversationID,
      title: undefined,
      visibility: 'public',
    });

    const updatedConversation2 = await getConversation({
      conversationID: createdConversation.conversationID,
    });
    if (!updatedConversation2) {
      throw new Error('Conversation not found');
    }

    expect(updatedConversation2.conversation.title).toBe('New Title');
    expect(updatedConversation2.conversation.visibility).toBe('public');
  });
});
