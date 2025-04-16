import type {
  LanguageModelMessage,
  ToolResultBlock,
  ToolUseBlock,
} from 'ai/lm';
import type { MessageInDB } from 'database/conversation';
import type { SSEMessage, SSEStreamingApi } from 'hono/streaming';
import type { PostChatEvent } from 'shared/schemas/shared-schemas-chat';
import { agentOrchestrator } from 'ai/agents/orchestrator';
import { completeStream } from 'ai/lm';
import {
  addMessageToConversation,
  getConversation,
  initConversation,
  updateMessageInConversation,
} from 'database/conversation';
import { getDocumentByID, getDocumentsBySpaceID } from 'database/documents';
import { analytics } from 'service-utils/analytics';
import { getContextLogger } from 'service-utils/logger';
import { searchDocuments } from '../documents/core-documents';
export {
  deleteConversation,
  getConversation,
  listConversations,
  removeMessageFromConversation,
} from 'database/conversation';

const logger = getContextLogger('core-chat.ts');

/**
 * Complete a conversation
 * @param root named parameters
 * @param root.prompt The prompt of the user
 * @param root.spaceID (optional) The space ID associated with the conversation
 * @param root.sseStream The SSE stream to write to
 * @param root.userID The user ID
 */
export async function completeNewConversation({
  prompt,
  spaceID,
  sseStream,
  userID,
}: {
  prompt: string;
  spaceID: string | undefined;
  sseStream: SSEStreamingApi;
  userID: string;
}): Promise<void> {
  const conversationStart = Date.now();
  const initStart = Date.now();
  const { conversation, message } = await initConversation({
    prompt,
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

  await completeMessage({
    history: [],
    message,
    spaceID,
    sseStream,
  });

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
 * @param root.spaceID (optional) The space ID associated with the conversation
 * @param root.sseStream The SSE stream to write to
 * @param root.userID The user ID
 */
export async function completeNewMessage({
  conversationID,
  prompt,
  spaceID,
  sseStream,
  userID,
}: {
  conversationID: string;
  prompt: string;
  spaceID: string | undefined;
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
        content: [{ text: previousMessage.prompt }],
        role: 'user',
      } satisfies LanguageModelMessage;
      if (previousMessage.response) {
        const assistantMessage = {
          content: [{ text: previousMessage.response }],
          role: 'assistant',
        } satisfies LanguageModelMessage;
        return [userMessage, assistantMessage];
      }
      return [userMessage];
    },
  );

  await completeMessage({ history, message, spaceID, sseStream });

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
 * @param root.spaceID The space ID if the chat is in a space
 * @param root.sseStream The SSE stream to write to
 * @param root.history The history of the conversation
 */
async function completeMessage({
  history,
  message,
  spaceID,
  sseStream,
}: {
  history: LanguageModelMessage[];
  message: MessageInDB;
  spaceID: string | undefined;
  sseStream: SSEStreamingApi;
}): Promise<void> {
  await finalizeMessage({
    history: [
      ...history,
      { content: [{ text: message.prompt }], role: 'user' },
    ],
    message,
    sseStream,
  });
  return;
  const messages: LanguageModelMessage[] = [
    ...history,
    {
      content: [{ text: message.prompt }],
      role: 'user',
    },
  ];
  let process = true;
  while (process) {
    logger.info('calling orchestrator');
    const response = await agentOrchestrator({
      messages,
      spaceID,
      traceID: message.conversationID,
      userID: message.userID,
    });
    messages.push(response.responseMessage);

    const toolResponses: ToolResultBlock[] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- need to improve those types
    for (const content of response.responseMessage.content!) {
      if (content.toolUse?.name === 'finalize_answer') {
        process = false;
        break;
      }

      if (!content.toolUse) {
        continue;
      }

      const toolResponse = await handleToolCall({
        spaceID,
        tool: content.toolUse,
        traceID: message.conversationID,
        userID: message.userID,
      });
      toolResponses.push(toolResponse);
    }

    if (toolResponses.length > 0) {
      messages.push({
        content: toolResponses.map((toolResponses) => {
          return {
            toolResult: toolResponses,
          };
        }),
        role: 'user',
      });
    }
  }
  await finalizeMessage({ history, message, sseStream });
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

/**
 * Do the final step in a message: request a model to answer the question with a streaming response and update the database with the result
 * @param root named parameters
 * @param root.message The message to stream
 * @param root.sseStream The SSE stream to write to
 * @param root.history The history of the conversation
 */
async function finalizeMessage({
  history,
  message,
  sseStream,
}: {
  history: LanguageModelMessage[];
  message: MessageInDB;
  sseStream: SSEStreamingApi;
}): Promise<void> {
  const llmStream = completeStream({
    messages: history,
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
 * Handle a tool call from the orchestrator
 * @param root named parameters
 * @param root.spaceID The space ID associated with the conversation
 * @param root.tool The tool to call
 * @param root.traceID The trace ID associated with the conversation
 * @param root.userID The user ID associated with the conversation
 * @returns The result of the tool call
 */
async function handleToolCall({
  spaceID,
  tool,
  traceID,
  userID,
}: {
  spaceID: string | undefined;
  tool: ToolUseBlock;
  traceID: string;
  userID: string;
}): Promise<ToolResultBlock> {
  switch (tool.name) {
    case 'list_documents': {
      if (!spaceID) {
        throw new Error('Space ID is required');
      }
      logger.info('Calling "getDocumentsBySpaceID"');
      const documents = await getDocumentsBySpaceID({ spaceID, userID });
      const cleanedDocuments = documents.map((document) => {
        return {
          documentID: document.documentID,
          title: document.title,
        };
      });
      return {
        content: [
          {
            json: {
              documents: cleanedDocuments,
            },
          },
        ],
        toolUseId: tool.toolUseId,
      };
    }

    case 'read_document': {
      // todo
      // @ts-expect-error improve those types later
      if (!tool.input || !tool.input.documentID) {
        const error = new Error('Document ID is required');
        analytics.captureException(error, userID, {
          toolInputs: tool.input,
          toolName: tool.name,
        });
        return {
          content: [
            {
              text: error.message,
            },
          ],
          status: 'error',
          toolUseId: tool.toolUseId,
        };
      }

      logger.info('Calling "getDocumentByID"');
      const documentChunks = await getDocumentByID({
        // @ts-expect-error improve those types later
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- todo
        documentID: tool.input.documentID,
        userID,
      });

      if (!documentChunks) {
        const error = new Error('Document not found');
        analytics.captureException(error, userID, {
          toolInputs: tool.input,
          toolName: tool.name,
        });
        return {
          content: [
            {
              text: error.message,
            },
          ],
          status: 'error',
          toolUseId: tool.toolUseId,
        };
      }

      return {
        content: [
          {
            json: {
              documentChunks: documentChunks,
            },
          },
        ],
        toolUseId: tool.toolUseId,
      };
    }

    case 'search_space': {
      if (!spaceID) {
        return {
          content: [
            {
              text: 'Space ID is required',
            },
          ],
          status: 'error',
          toolUseId: tool.toolUseId,
        };
      }
      // todo
      // @ts-expect-error improve those types later
      if (!tool.input || !tool.input.query) {
        const error = new Error('Query is required');
        // todo better analytics
        analytics.captureException(error, userID, {
          toolInputs: tool.input,
          toolName: tool.name,
        });
        return {
          content: [
            {
              text: error.message,
            },
          ],
          status: 'error',
          toolUseId: tool.toolUseId,
        };
      }

      logger.info('Calling "searchDocuments"');
      const searchResults = await searchDocuments({
        maxOutputResults: 10,
        maxSearchResults: 50,
        // @ts-expect-error improve those types later
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- todo
        query: tool.input.query,
        spaceID,
        speed: 'detailed',
        traceID,
        userID,
      });
      return {
        content: [
          {
            json: {
              searchResults: searchResults,
            },
          },
        ],
        toolUseId: tool.toolUseId,
      };
    }

    default: {
      const error = new Error(`Unknown tool / not implemented: ${tool.name}`);
      analytics.captureException(error, userID, {
        toolInputs: tool.input,
        toolName: tool.name,
      });
      return {
        content: [
          {
            text: 'Error: unknown tool / not implemented',
          },
        ],
        status: 'error',
        toolUseId: tool.toolUseId,
      };
    }
  }
}
