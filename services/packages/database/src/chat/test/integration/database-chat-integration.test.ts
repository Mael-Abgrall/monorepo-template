import { describe, expect, it } from 'vitest';
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
} from '../../database-chat';

describe('createConversation', () => {
  it('should create a new conversation, and return it', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    expect(conversation).toBeDefined();
    expect(conversation.conversationID).toBeDefined();
    expect(conversation.createdAt).toBeDefined();
    expect(conversation.messages).toBeDefined();
    expect(conversation.messages.length).toBe(1);
    expect(conversation.messages[0].prompt).toBe(
      'What is the capital of the moon?',
    );
    expect(conversation.userID).toBe(userID);
    expect(conversation.visibility).toBe('private');
  });
});

describe('getConversation', () => {
  it('should get a conversation by ID', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    const pulledConversation = await getConversation({
      conversationID: createdConversation.conversationID,
    });

    expect(pulledConversation).toBeDefined();
    expect(pulledConversation.messages).toBeDefined();
    expect(pulledConversation.messages.length).toBe(1);
    expect(pulledConversation.messages[0].prompt).toBe(
      'What is the capital of the moon?',
    );
  });
});

describe('deleteConversation', () => {
  it('should delete a conversation by ID', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
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
  });
});

describe('listConversations', () => {
  it('should list conversations by user ID', async () => {
    const userID = crypto.randomUUID();
    const createdConversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    const createdConversation2 = await createConversation({
      prompt: 'What time is it?',
      title: 'Time',
      userID,
    });

    const conversations = await listConversations({
      userID,
    });

    expect(conversations).toBeDefined();
    expect(conversations.length).toBe(2);
    expect(conversations[0].conversationID).toBe(
      createdConversation.conversationID,
    );
    expect(conversations[1].conversationID).toBe(
      createdConversation2.conversationID,
    );
    expect(conversations[0].title).toBe('Moon Capital');
    expect(conversations[1].title).toBe('Time');
  });

  it('should not return conversations for other users', async () => {
    const userID = crypto.randomUUID();
    const userID2 = crypto.randomUUID();
    const createdConversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    const conversations = await listConversations({
      userID: userID2,
    });
    const pulledConversation = await getConversation({
      conversationID: createdConversation.conversationID,
    });

    expect(conversations).toBeDefined();
    expect(conversations.length).toBe(0);
    expect(pulledConversation).toBeDefined();
  });
});
