import type { SSEStreamingApi } from 'hono/streaming';
import { completeStream } from 'ai/lm';
import {
  addMessageToConversation,
  getConversation,
  initConversation,
  updateMessageInConversation,
} from 'database/conversation';
import { analytics } from 'service-utils/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeNewConversation, completeNewMessage } from '../../core-chat';

vi.mock('ai/lm');
vi.mock('database/conversation');
vi.mock('service-utils/analytics', () => {
  return {
    analytics: {
      capture: vi.fn(),
      captureException: vi.fn(),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

const mockSSEStream = {
  abort: vi.fn().mockResolvedValue(undefined),
  aborted: false,
  close: vi.fn().mockResolvedValue(undefined),
  closed: false,
  onAbort: vi.fn().mockResolvedValue(undefined),
  pipe: vi.fn().mockResolvedValue(undefined),
  responseReadable: new ReadableStream(),
  sleep: vi.fn().mockResolvedValue(undefined),
  write: vi.fn().mockResolvedValue(undefined),
  writeln: vi.fn().mockResolvedValue(undefined),
  writeSSE: vi.fn().mockResolvedValue(undefined),
} satisfies SSEStreamingApi;

// todo: handle abort

describe('completeNewConversation', () => {
  it('Should create a conversation, stream the response, update the conversation and send analytics', async () => {
    const mockInitConversation = {
      conversation: {
        conversationID: 'conversationID',
        createdAt: new Date(),
        spaceID: undefined,
        userID: 'userID',
      },
      message: {
        conversationID: 'conversationID',
        createdAt: new Date(),
        initiatives: undefined,
        messageID: 'messageID',
        prompt: 'Hello, world!',
        response: undefined,
        sources: undefined,
        userID: 'userID',
      },
    } satisfies Awaited<ReturnType<typeof initConversation>>;

    vi.mocked(initConversation).mockResolvedValue(
      mockInitConversation satisfies Awaited<
        ReturnType<typeof initConversation>
      >,
    );

    vi.mocked(completeStream).mockImplementation(async function* () {
      yield 'Hello';
      yield ' world';
    });

    vi.mocked(updateMessageInConversation).mockResolvedValue(
      void 0 satisfies Awaited<ReturnType<typeof updateMessageInConversation>>,
    );

    await completeNewConversation({
      prompt: 'Hello, world!',
      sseStream: mockSSEStream,
      userID: 'userID',
    });

    expect(vi.mocked(initConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(completeStream)).toHaveBeenCalledOnce();
    expect(mockSSEStream.writeSSE).toHaveBeenCalledTimes(3);
    expect(mockSSEStream.writeSSE.mock.calls[0][0]).toEqual({
      data: JSON.stringify(mockInitConversation),
      event: 'create-conversation',
    });
    expect(mockSSEStream.writeSSE.mock.calls[1][0]).toEqual({
      data: JSON.stringify({
        completion: 'Hello',
        messageID: mockInitConversation.message.messageID,
      }),
      event: 'completion',
    });
    expect(mockSSEStream.writeSSE.mock.calls[2][0]).toEqual({
      data: JSON.stringify({
        completion: ' world',
        messageID: mockInitConversation.message.messageID,
      }),
      event: 'completion',
    });
    expect(vi.mocked(updateMessageInConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(analytics.capture)).toHaveBeenCalledTimes(2);
    expect(mockSSEStream.close).toHaveBeenCalledOnce();
  });
});

describe('completeNewMessage', () => {
  it('Should add a message to the conversation, fetch the history and send it to the LLM, stream the response, update the conversation and send analytics', async () => {
    const mockConversation = {
      conversationID: 'conversationID',
      createdAt: new Date(),
      initiatives: undefined,
      messageID: 'messageID',
      prompt: 'Hello, world!',
      response: undefined,
      sources: undefined,
      userID: 'userID',
    } satisfies Awaited<ReturnType<typeof addMessageToConversation>>;
    vi.mocked(addMessageToConversation).mockResolvedValue(
      mockConversation satisfies Awaited<
        ReturnType<typeof addMessageToConversation>
      >,
    );

    vi.mocked(getConversation).mockResolvedValue({
      conversation: {
        conversationID: 'conversationID',
        createdAt: new Date(),
        spaceID: undefined,
        userID: 'userID',
      },
      messages: [
        {
          conversationID: 'conversationID',
          createdAt: new Date(),
          initiatives: undefined,
          messageID: 'messageID1',
          prompt: 'the first message',
          response: 'the first response',
          sources: undefined,
          userID: 'userID',
        },
      ],
    } satisfies Awaited<ReturnType<typeof getConversation>>);

    vi.mocked(completeStream).mockImplementation(async function* () {
      yield 'Hello';
      yield ' world';
    });

    vi.mocked(updateMessageInConversation).mockResolvedValue(
      void 0 satisfies Awaited<ReturnType<typeof updateMessageInConversation>>,
    );

    await completeNewMessage({
      conversationID: 'conversationID',
      prompt: 'Hello, world!',
      sseStream: mockSSEStream,
      userID: 'userID',
    });

    expect(vi.mocked(addMessageToConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(getConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(completeStream)).toHaveBeenCalledOnce();
    expect(vi.mocked(completeStream)).toHaveBeenCalledWith({
      messages: [
        {
          content: 'the first message',
          role: 'user',
        },
        {
          content: 'the first response',
          role: 'assistant',
        },
        {
          content: 'Hello, world!',
          role: 'user',
        },
      ],
      model: expect.any(String),
      traceID: 'conversationID',
      userID: 'userID',
    });
    expect(mockSSEStream.writeSSE).toHaveBeenCalledTimes(3);
    expect(mockSSEStream.writeSSE.mock.calls[0][0]).toEqual({
      data: JSON.stringify(mockConversation),
      event: 'create-message',
    });
    expect(mockSSEStream.writeSSE.mock.calls[1][0]).toEqual({
      data: JSON.stringify({
        completion: 'Hello',
        messageID: mockConversation.messageID,
      }),
      event: 'completion',
    });
    expect(mockSSEStream.writeSSE.mock.calls[2][0]).toEqual({
      data: JSON.stringify({
        completion: ' world',
        messageID: mockConversation.messageID,
      }),
      event: 'completion',
    });
    expect(vi.mocked(updateMessageInConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(analytics.capture)).toHaveBeenCalledTimes(2);
    expect(mockSSEStream.close).toHaveBeenCalledOnce();
  });

  it('should throw if the conversation does not exist', async () => {
    vi.mocked(getConversation).mockResolvedValue(undefined);

    await expect(
      completeNewMessage({
        conversationID: 'conversationID',
        prompt: 'Hello, world!',
        sseStream: mockSSEStream,
        userID: 'userID',
      }),
    ).rejects.toThrow('Conversation not found');
  });

  it('should handle history with no response', async () => {
    const mockConversation = {
      conversationID: 'conversationID',
      createdAt: new Date(),
      initiatives: undefined,
      messageID: 'messageID',
      prompt: 'Hello, world!',
      response: undefined,
      sources: undefined,
      userID: 'userID',
    } satisfies Awaited<ReturnType<typeof addMessageToConversation>>;
    vi.mocked(addMessageToConversation).mockResolvedValue(
      mockConversation satisfies Awaited<
        ReturnType<typeof addMessageToConversation>
      >,
    );

    vi.mocked(getConversation).mockResolvedValue({
      conversation: {
        conversationID: 'conversationID',
        createdAt: new Date(),
        spaceID: undefined,
        userID: 'userID',
      },
      messages: [
        {
          conversationID: 'conversationID',
          createdAt: new Date(),
          initiatives: undefined,
          messageID: 'messageID1',
          prompt: 'the first message',
          response: undefined,
          sources: undefined,
          userID: 'userID',
        },
      ],
    } satisfies Awaited<ReturnType<typeof getConversation>>);

    vi.mocked(completeStream).mockImplementation(async function* () {
      yield 'Hello';
      yield ' world';
    });

    vi.mocked(updateMessageInConversation).mockResolvedValue(
      void 0 satisfies Awaited<ReturnType<typeof updateMessageInConversation>>,
    );

    await completeNewMessage({
      conversationID: 'conversationID',
      prompt: 'Hello, world!',
      sseStream: mockSSEStream,
      userID: 'userID',
    });

    expect(vi.mocked(addMessageToConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(getConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(completeStream)).toHaveBeenCalledOnce();
    expect(vi.mocked(completeStream)).toHaveBeenCalledWith({
      messages: [
        {
          content: 'the first message',
          role: 'user',
        },
        {
          content: 'Hello, world!',
          role: 'user',
        },
      ],
      model: expect.any(String),
      traceID: 'conversationID',
      userID: 'userID',
    });
    expect(mockSSEStream.writeSSE).toHaveBeenCalledTimes(3);
    expect(mockSSEStream.writeSSE.mock.calls[0][0]).toEqual({
      data: JSON.stringify(mockConversation),
      event: 'create-message',
    });
    expect(mockSSEStream.writeSSE.mock.calls[1][0]).toEqual({
      data: JSON.stringify({
        completion: 'Hello',
        messageID: mockConversation.messageID,
      }),
      event: 'completion',
    });
    expect(mockSSEStream.writeSSE.mock.calls[2][0]).toEqual({
      data: JSON.stringify({
        completion: ' world',
        messageID: mockConversation.messageID,
      }),
      event: 'completion',
    });
    expect(vi.mocked(updateMessageInConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(analytics.capture)).toHaveBeenCalledTimes(2);
    expect(mockSSEStream.close).toHaveBeenCalledOnce();
  });
});
