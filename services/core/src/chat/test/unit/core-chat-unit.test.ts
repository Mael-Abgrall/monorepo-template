import type { SSEStreamingApi } from 'hono/streaming';
import { claude37SonnetStream } from 'ai/providers/lm/ai-providers-lm-aws';
import {
  addMessageToConversation,
  initConversation,
  updateMessageInConversation,
} from 'database/conversation';
import { analytics } from 'service-utils/analytics';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { completeNewConversation, completeNewMessage } from '../../core-chat';

vi.mock('ai/providers/lm/ai-providers-lm-aws');
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
        title: 'Test',
        userID: 'userID',
        visibility: 'private',
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

    vi.mocked(claude37SonnetStream).mockImplementation(async function* () {
      yield 'Hello';
      yield ' world';
    });

    vi.mocked(updateMessageInConversation).mockResolvedValue(
      void 0 satisfies Awaited<ReturnType<typeof updateMessageInConversation>>,
    );

    await completeNewConversation({
      prompt: 'Hello, world!',
      sseStream: mockSSEStream,
      userID: '123',
    });

    expect(vi.mocked(initConversation)).toHaveBeenCalledOnce();
    expect(vi.mocked(claude37SonnetStream)).toHaveBeenCalledOnce();
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
  it('Should add a message to the conversation, stream the response, update the conversation and send analytics', async () => {
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

    vi.mocked(claude37SonnetStream).mockImplementation(async function* () {
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
    expect(vi.mocked(claude37SonnetStream)).toHaveBeenCalledOnce();
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
