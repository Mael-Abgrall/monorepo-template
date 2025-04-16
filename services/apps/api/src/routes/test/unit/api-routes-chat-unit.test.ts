import type { Environment } from 'service-utils/environment';
import type {
  ListConversationsResponse,
  PostChatBody,
} from 'shared/schemas/shared-schemas-chat';
import {
  completeNewConversation,
  completeNewMessage,
  getConversation,
  listConversations,
} from 'core/chat';
import { setEnvironment } from 'service-utils/environment';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import app from '../../..';
import { getSignedCookieCustom } from '../../../helpers/api-helpers-cookies';
import { verifyToken } from '../../../helpers/api-helpers-jwt';

vi.mock('core/chat');
vi.mock('../../../helpers/api-helpers-cookies');
vi.mock('../../../helpers/api-helpers-jwt');

beforeAll(() => {
  setEnvironment({
    env: process.env as unknown as Environment,
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /chat/conversation/:conversationID', () => {
  it('is protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    const response = await app.request('/chat/conversation/123');
    expect(response.status).toBe(401);
  });

  it('should return a conversation', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const mockConversation = {
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
          initiatives: [
            {
              action: 'test',
            },
          ],
          messageID: '123',
          prompt: 'Hello, world!',
          response: 'Hello, world!',
          sources: [
            {
              chunk: 'Hello, world!',
              chunkID: '123',
              documentID: '123',
              origin: 'test',
              title: 'Test',
              url: 'https://test.com',
            },
          ],
          userID: 'userID',
        },
      ],
    } satisfies Awaited<ReturnType<typeof getConversation>>;

    vi.mocked(getConversation).mockResolvedValueOnce(
      mockConversation satisfies Awaited<ReturnType<typeof getConversation>>,
    );

    const response = await app.request('/chat/conversation/conversationID');
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      conversation: {
        ...mockConversation.conversation,
        createdAt: mockConversation.conversation.createdAt.toISOString(),
      },
      messages: mockConversation.messages.map((message) => {
        return {
          ...message,
          createdAt: message.createdAt.toISOString(),
        };
      }),
    });
  });

  it('should return 404 if the conversation is not found', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    vi.mocked(getConversation).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getConversation>>,
    );

    const response = await app.request('/chat/conversation/does-not-exist');
    expect(response.status).toBe(404);

    expect(getConversation).toHaveBeenCalledWith({
      conversationID: 'does-not-exist',
      userID: 'test-user-id',
    });
  });
});

describe('POST /chat', () => {
  it('should be protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    const response = await app.request('/chat');
    expect(response.status).toBe(401);
  });

  it('should return 400 if the prompt is not provided', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    const response = await app.request('/chat/text', {
      method: 'POST',
    });
    expect(response.status).toBe(400);
  });

  it('should create a new conversation if conversationID is not provided', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    vi.mocked(completeNewConversation).mockResolvedValueOnce(
      void 0 satisfies Awaited<ReturnType<typeof completeNewConversation>>,
    );

    const response = await app.request('/chat/text', {
      body: JSON.stringify({
        prompt: 'Hello, world!',
      } satisfies PostChatBody),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    expect(response.status).toBe(200);
    expect(completeNewConversation).toHaveBeenCalledWith({
      prompt: 'Hello, world!',
      sseStream: expect.any(Object),
      userID: 'test-user-id',
    });
  });

  it('should create a new message if conversationID is provided', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    vi.mocked(completeNewMessage).mockResolvedValueOnce(
      void 0 satisfies Awaited<ReturnType<typeof completeNewMessage>>,
    );

    const response = await app.request('/chat/text', {
      body: JSON.stringify({
        conversationID: '123',
        prompt: 'Hello, world!',
      } satisfies PostChatBody),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });
    expect(response.status).toBe(200);
    expect(completeNewConversation).not.toHaveBeenCalled();
    expect(completeNewMessage).toHaveBeenCalledWith({
      conversationID: '123',
      prompt: 'Hello, world!',
      sseStream: expect.any(Object),
      userID: 'test-user-id',
    });
  });
});

describe('GET /chat/list', () => {
  it('should be protected by cookies', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      undefined satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    const response = await app.request('/chat/list');
    expect(response.status).toBe(401);
  });

  it('should return a list of conversations', async () => {
    vi.mocked(getSignedCookieCustom).mockResolvedValueOnce(
      'testToken' satisfies Awaited<ReturnType<typeof getSignedCookieCustom>>,
    );
    vi.mocked(verifyToken).mockResolvedValueOnce({
      userID: 'test-user-id',
    } satisfies Awaited<ReturnType<typeof verifyToken>>);

    vi.mocked(listConversations).mockResolvedValueOnce([
      {
        conversationID: '123',
        createdAt: new Date(),
        spaceID: undefined,
        userID: 'test-user-id',
      },
      {
        conversationID: '456',
        createdAt: new Date(),
        spaceID: undefined,
        userID: 'test-user-id',
      },
    ] satisfies Awaited<ReturnType<typeof listConversations>>);

    const response = await app.request('/chat/list');

    expect(listConversations).toHaveBeenCalledWith({
      userID: 'test-user-id',
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as ListConversationsResponse;
    expect(body.length).toBe(2);
    expect(body[0].conversationID).toBe('123');
    expect(body[1].conversationID).toBe('456');
  });
});
