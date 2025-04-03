import { eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import { pgDatabase } from '../../../config/database-postgresql';
import { createConversation } from '../../database-chat-conversation';
import {
  createMessage,
  deleteMessage,
  updateMessage,
} from '../../database-chat-message';
import { messagesTable } from '../../database-chat-schemas';

describe('createMessage', () => {
  it('should create a new message and return it', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    const message = await createMessage({
      conversationID: conversation.conversationID,
      prompt: 'were in the moon',
      userID,
    });

    expect(message).toBeDefined();
    expect(message).toStrictEqual({
      conversationID: conversation.conversationID,
      createdAt: expect.any(Date),
      initiatives: undefined,
      messageID: expect.any(String),
      prompt: 'were in the moon',
      response: undefined,
      sources: undefined,
      userID,
    });

    const pulledMessages = await pgDatabase.select().from(messagesTable);

    expect(pulledMessages.length).toBe(2);
    expect(pulledMessages[1].messageID).toBe(message.messageID);
  });

  it('should fail if the conversation does not exist', async () => {
    await expect(
      createMessage({
        conversationID: crypto.randomUUID(),
        prompt: 'What is the capital of the moon?',
        userID: crypto.randomUUID(),
      }),
    ).rejects.toThrow();
  });
});

describe('deleteMessage', () => {
  it('should delete a message', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    await deleteMessage({
      messageID: conversation.messages[0].messageID,
      userID,
    });

    const pulledMessages = await pgDatabase.select().from(messagesTable);

    expect(pulledMessages.length).toBe(0);
  });

  it('should not delete a message if the user ID does not match', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    await deleteMessage({
      messageID: conversation.messages[0].messageID,
      userID: crypto.randomUUID(),
    });

    const pulledMessages = await pgDatabase.select().from(messagesTable);

    expect(pulledMessages.length).toBe(1);
    expect(pulledMessages[0].messageID).toBe(
      conversation.messages[0].messageID,
    );
  });
});

describe('updateMessage', () => {
  it('should update a message', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    await updateMessage({
      initiatives: [{ action: 'search' }],
      messageID: conversation.messages[0].messageID,
      prompt: 'updated prompt',
      response: 'updated response',
      sources: [
        {
          chunk: 'The capital of the moon is the moon.',
          chunkID: crypto.randomUUID(),
          documentID: crypto.randomUUID(),
          origin: 'wikipedia',
          title: 'The capital of the moon',
          url: 'https://demo.com',
        },
      ],
      userID,
    });

    const pulledMessages = await pgDatabase
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.messageID, conversation.messages[0].messageID));

    expect(pulledMessages[0]).toStrictEqual({
      conversationID: conversation.conversationID,
      createdAt: expect.any(Date),
      initiatives: [{ action: 'search' }],
      messageID: conversation.messages[0].messageID,
      prompt: 'updated prompt',
      response: 'updated response',
      sources: [
        {
          chunk: 'The capital of the moon is the moon.',
          chunkID: expect.any(String),
          documentID: expect.any(String),
          origin: 'wikipedia',
          title: 'The capital of the moon',
          url: 'https://demo.com',
        },
      ],
      userID,
    });
  });

  it('should not update a message if the user ID does not match', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    await updateMessage({
      initiatives: [{ action: 'search' }],
      messageID: conversation.messages[0].messageID,
      prompt: 'updated prompt',
      response: 'updated response',
      sources: [
        {
          chunk: 'updated chunk',
          chunkID: crypto.randomUUID(),
          documentID: crypto.randomUUID(),
          origin: 'wikipedia',
          title: 'The capital of the moon',
          url: 'https://demo.com',
        },
      ],
      userID: crypto.randomUUID(),
    });

    const pulledMessages = await pgDatabase
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.messageID, conversation.messages[0].messageID));

    expect(pulledMessages[0]).toStrictEqual({
      conversationID: conversation.conversationID,
      createdAt: expect.any(Date),
      initiatives: null,
      messageID: conversation.messages[0].messageID,
      prompt: 'What is the capital of the moon?',
      response: null,
      sources: null,
      userID,
    });
  });

  it('should not update undefined fields', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    await updateMessage({
      messageID: conversation.messages[0].messageID,
      prompt: 'updated prompt',
      userID,
    });

    const pulledMessages = await pgDatabase
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.messageID, conversation.messages[0].messageID));

    const expectedMessage = {
      ...conversation.messages[0],
      conversationID: conversation.conversationID,
      createdAt: expect.any(Date),
      initiatives: null,
      prompt: 'updated prompt',
      response: null,
      sources: null,
      userID,
    };
    expect(pulledMessages[0]).toStrictEqual(expectedMessage);

    await updateMessage({
      messageID: conversation.messages[0].messageID,
      response: 'updated response',
      userID,
    });

    const pulledMessages1 = await pgDatabase
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.messageID, conversation.messages[0].messageID));

    expect(pulledMessages1[0]).toStrictEqual({
      ...expectedMessage,
      response: 'updated response',
    });

    await updateMessage({
      messageID: conversation.messages[0].messageID,
      sources: [
        {
          chunk: 'updated chunk',
          chunkID: crypto.randomUUID(),
          documentID: crypto.randomUUID(),
          origin: 'wikipedia',
          title: 'The capital of the moon',
          url: 'https://demo.com',
        },
      ],
      userID,
    });

    const pulledMessages2 = await pgDatabase
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.messageID, conversation.messages[0].messageID));

    expect(pulledMessages2[0]).toStrictEqual({
      ...expectedMessage,
      prompt: 'updated prompt',
      response: 'updated response',
      sources: [
        {
          chunk: 'updated chunk',
          chunkID: expect.any(String),
          documentID: expect.any(String),
          origin: 'wikipedia',
          title: 'The capital of the moon',
          url: 'https://demo.com',
        },
      ],
    });
  });

  it('should fail if there are no changes', async () => {
    const userID = crypto.randomUUID();
    const conversation = await createConversation({
      prompt: 'What is the capital of the moon?',
      title: 'Moon Capital',
      userID,
    });

    await expect(
      updateMessage({
        messageID: conversation.messages[0].messageID,
        userID,
      }),
    ).rejects.toThrow();
  });
});
