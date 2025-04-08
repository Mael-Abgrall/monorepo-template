import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createConversation } from '../../database-chat-conversation';
import { initConversation } from '../../database-chat-interface';
import { createMessage } from '../../database-chat-message';

vi.mock('../../database-chat-conversation', () => {
  return {
    createConversation: vi.fn(),
  };
});

vi.mock('../../database-chat-message', () => {
  return {
    createMessage: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('initConversation', () => {
  it('should call createConversation and createMessage with correct parameters', async () => {
    const userID = 'test-user-id';
    const prompt = 'test prompt';
    const mockConversation = {
      conversationID: 'test-conversation-id',
      createdAt: new Date(),
      spaceID: undefined,
      userID,
    } satisfies Awaited<ReturnType<typeof createConversation>>;
    const mockMessage = {
      conversationID: mockConversation.conversationID,
      createdAt: new Date(),
      initiatives: undefined,
      messageID: 'test-message-id',
      prompt,
      response: '',
      sources: undefined,
      userID,
    } satisfies Awaited<ReturnType<typeof createMessage>>;
    vi.mocked(createConversation).mockResolvedValue(mockConversation);
    vi.mocked(createMessage).mockResolvedValue(mockMessage);

    const result = await initConversation({ prompt, userID });
    expect(createConversation).toHaveBeenCalledWith({ userID });
    expect(createMessage).toHaveBeenCalledWith({
      conversationID: mockConversation.conversationID,
      prompt,
      userID,
    });
    expect(result).toEqual({
      conversation: mockConversation,
      message: mockMessage,
    });
    // @ts-expect-error -- don't care
    expect(createMessage).toHaveBeenCalledAfter(createConversation);
  });
});
