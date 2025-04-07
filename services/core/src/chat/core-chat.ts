import type { LMMessage } from 'ai/lm';
import type { MessageInDB } from 'database/conversation';
import type { SSEMessage, SSEStreamingApi } from 'hono/streaming';
import type { PostChatEvent } from 'shared/schemas/shared-schemas-chat';
import { completeStream } from 'ai/lm';
import {
  addMessageToConversation,
  getConversation,
  initConversation,
  updateMessageInConversation,
} from 'database/conversation';
import { analytics } from 'service-utils/analytics';

export {
  deleteConversation,
  getConversation,
  listConversations,
  removeMessageFromConversation,
  updateConversation,
} from 'database/conversation';

/**
 * Complete a conversation
 * @param root named parameters
 * @param root.prompt The prompt of the user
 * @param root.userID The user ID
 * @param root.sseStream The SSE stream to write to
 */
export async function completeNewConversation({
  prompt,
  sseStream,
  userID,
}: {
  prompt: string;
  sseStream: SSEStreamingApi;
  userID: string;
}): Promise<void> {
  const conversationStart = Date.now();
  const initStart = Date.now();
  const { conversation, message } = await initConversation({
    prompt,
    title: prompt.slice(0, 20),
    userID,
  });
  const initEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (initEnd - initStart) / 1000, // in seconds
      $ai_span_name: 'create conversation',
      $ai_trace_id: conversation.conversationID,
    },
  });

  await sseStream.writeSSE(
    createEvent({
      data: {
        conversation,
        message,
      },
      event: 'create-conversation',
    }),
  );

  await completeMessage({ history: [], message, sseStream });

  const conversationEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_trace',
    properties: {
      $ai_latency: (conversationEnd - conversationStart) / 1000, // in seconds
      $ai_span_name: 'conversation',
      $ai_trace_id: conversation.conversationID,
    },
  });
  await sseStream.close();
}

/**
 * Complete a follow up message to an existing conversation
 * @param root named parameters
 * @param root.conversationID The conversation ID
 * @param root.prompt The prompt of the user
 * @param root.sseStream The SSE stream to write to
 * @param root.userID The user ID
 */
export async function completeNewMessage({
  conversationID,
  prompt,
  sseStream,
  userID,
}: {
  conversationID: string;
  prompt: string;
  sseStream: SSEStreamingApi;
  userID: string;
}): Promise<void> {
  const conversationAndMessages = await getConversation({
    conversationID,
    userID,
  });
  if (!conversationAndMessages) {
    throw new Error('Conversation not found');
  }
  const messageStart = Date.now();
  const addMessageStart = Date.now();
  const message = await addMessageToConversation({
    conversationID,
    prompt,
    userID,
  });
  const addMessageEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (addMessageEnd - addMessageStart) / 1000, // in seconds
      $ai_span_name: 'add message to conversation',
      $ai_trace_id: conversationID,
    },
  });

  await sseStream.writeSSE(
    createEvent({
      data: message,
      event: 'create-message',
    }),
  );
  const history = conversationAndMessages.messages.flatMap(
    (previousMessage) => {
      const userMessage = {
        content: previousMessage.prompt,
        role: 'user',
      } satisfies LMMessage;
      if (previousMessage.response) {
        const assistantMessage = {
          content: previousMessage.response,
          role: 'assistant',
        } satisfies LMMessage;
        return [userMessage, assistantMessage];
      }
      return [userMessage];
    },
  );

  await completeMessage({ history, message, sseStream });

  const messageEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_trace',
    properties: {
      $ai_latency: (messageEnd - messageStart) / 1000, // in seconds
      $ai_span_name: 'conversation',
      $ai_trace_id: conversationID,
    },
  });
  await sseStream.close();
}

/**
 * Stream the completion of a message to the user, and gradually update it in the database
 * @param root named parameters
 * @param root.message The message to stream
 * @param root.sseStream The SSE stream to write to
 * @param root.history The history of the conversation
 */
async function completeMessage({
  history,
  message,
  sseStream,
}: {
  history: LMMessage[];
  message: MessageInDB;
  sseStream: SSEStreamingApi;
}): Promise<void> {
  const llmStream = completeStream({
    messages: [
      ...history,
      {
        content: message.prompt,
        role: 'user',
      },
    ],
    model: 'claude-3-7-sonnet',
    traceID: message.conversationID,
    userID: message.userID,
  });

  let fullResponse = '';
  for await (const textPart of llmStream) {
    fullResponse += textPart;
    await sseStream.writeSSE(
      createEvent({
        data: {
          completion: textPart,
          messageID: message.messageID,
        },
        event: 'completion',
      }),
    );
  }

  await updateMessageInConversation({
    messageID: message.messageID,
    prompt: message.prompt,
    response: fullResponse,
    userID: message.userID,
  });
}

/**
 * A simple wrapper to help with the typing of the event.
 * @param root named parameters
 * @param root.event the event to send
 * @param root.data the data to send
 * @returns the event to send to the client
 */
function createEvent({ data, event }: PostChatEvent): SSEMessage {
  return {
    data: JSON.stringify(data),
    event,
  };
}
