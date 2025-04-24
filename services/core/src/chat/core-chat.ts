import type {
  LanguageModelMessage,
  ToolResultBlock,
  ToolUseBlock,
} from 'ai/lm';
import type { ChatInDB } from 'database/chat';
import type { SSEMessage, SSEStreamingApi } from 'hono/streaming';
import type { ChatEvent } from 'shared/schemas/shared-schemas-chat';
import { agentOrchestrator } from 'ai/agents/orchestrator';
import { createChat, getChat, updateMessagesInChat } from 'database/chat';
import { getDocumentByID, getDocumentsBySpaceID } from 'database/documents';
import { analytics } from 'service-utils/analytics';
import { getContextLogger } from 'service-utils/logger';
import { searchDocuments } from '../documents/core-documents';

export { getChat, listChatsInSpace } from 'database/chat';

const logger = getContextLogger('core-chat.ts');

/**
 * Complete a chat
 * @param root named parameters
 * @param root.prompt The prompt of the user
 * @param root.spaceID (optional) The space ID associated with the chat
 * @param root.sseStream The SSE stream to write to
 * @param root.userID The user ID
 */
export async function completeNewChat({
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
  const chatStart = Date.now();
  const initStart = Date.now();
  const chat = await createChat({
    messages: [
      {
        content: [{ text: prompt }],
        role: 'user',
      },
    ],
    spaceID,
    userID,
  });
  const initEnd = Date.now();
  const traceID = chat.chatID;
  analytics.capture({
    distinctId: userID,
    event: '$ai_span',
    properties: {
      $ai_latency: (initEnd - initStart) / 1000, // in seconds
      $ai_span_name: 'create chat',
      $ai_trace_id: traceID,
    },
  });

  await updateMessagesInChat({
    chatID: chat.chatID,
    messages: chat.messages,
    userID,
  });

  await sseStream.writeSSE(
    createEvent({
      data: {
        chatID: chat.chatID,
        createdAt: chat.createdAt,
        // @ts-expect-error need to update types for ours
        messages: chat.messages,
        spaceID: chat.spaceID,
        userID,
      },
      event: 'new-chat',
    }),
  );

  await completeMessage({
    chat,
    sseStream,
    traceID,
  });

  const chatEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_trace',
    properties: {
      $ai_latency: (chatEnd - chatStart) / 1000, // in seconds
      $ai_span_name: 'chat',
      $ai_trace_id: traceID,
    },
  });
  await sseStream.close();
}

/**
 * Complete a follow up message to an existing chat
 * @param root named parameters
 * @param root.prompt The prompt of the user
 * @param root.sseStream The SSE stream to write to
 * @param root.userID The user ID
 * @param root.chatID The chat ID
 */
export async function completeNewMessage({
  chatID,
  prompt,
  sseStream,
  userID,
}: {
  chatID: string;
  prompt: string;
  sseStream: SSEStreamingApi;
  userID: string;
}): Promise<void> {
  const messageStart = Date.now();
  const chat = await getChat({
    chatID,
    userID,
  });
  if (!chat) {
    throw new Error('chat not found');
  }

  const traceID = chat.chatID;
  await addMessageToChat({
    chat,
    message: {
      content: [{ text: prompt }],
      role: 'user',
    },
    sseStream,
  });

  await completeMessage({ chat, sseStream, traceID });

  const messageEnd = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_trace',
    properties: {
      $ai_latency: (messageEnd - messageStart) / 1000, // in seconds
      $ai_span_name: 'chat',
      $ai_trace_id: traceID,
    },
  });
  await sseStream.close();
}

/**
 * Add a message to a chat, sync with the DB and stream the update to the client
 * @param root named parameters
 * @param root.chat The chat to add the message to
 * @param root.message The message to add
 * @param root.sseStream The SSE stream to write to
 */
async function addMessageToChat({
  chat,
  message,
  sseStream,
}: {
  chat: ChatInDB;
  message: LanguageModelMessage;
  sseStream: SSEStreamingApi;
}): Promise<void> {
  chat.messages.push(message);
  await updateMessagesInChat({
    chatID: chat.chatID,
    messages: chat.messages,
    userID: chat.userID,
  });
  await sseStream.writeSSE(
    createEvent({
      data: {
        chatID: chat.chatID,
        message,
      },
      event: 'new-message',
    }),
  );
}

/**
 * Stream the completion of a message to the user, and gradually update it in the database
 * @param root named parameters
 * @param root.chat The chat to complete
 * @param root.sseStream The SSE stream to write to
 * @param root.traceID The trace ID associated with the chat
 */
async function completeMessage({
  chat,
  sseStream,
  traceID,
}: {
  chat: ChatInDB;
  sseStream: SSEStreamingApi;
  traceID: string;
}): Promise<void> {
  let continueProcessing: 'end_turn' | 'tool_use' | undefined = undefined;
  while (continueProcessing !== 'end_turn') {
    logger.info('calling orchestrator');
    const response = await agentOrchestrator({
      messages: chat.messages,
      spaceID: chat.spaceID,
      traceID,
      userID: chat.userID,
    });
    // @ts-expect-error need to improve those types
    continueProcessing = response.stopReason;

    await addMessageToChat({
      chat,
      message: response.responseMessage,
      sseStream,
    });

    const toolResponses: ToolResultBlock[] = [];
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- need to improve those types
    for (const content of response.responseMessage.content!) {
      if (!content.toolUse) {
        continue;
      }

      const toolResponse = await handleToolCall({
        spaceID: chat.spaceID,
        tool: content.toolUse,
        traceID,
        userID: chat.userID,
      });
      toolResponses.push(toolResponse);
    }

    if (toolResponses.length > 0) {
      chat.messages.push({
        content: toolResponses.map((toolResponses) => {
          return {
            toolResult: toolResponses,
          };
        }),
        role: 'user',
      });
    }
  }
}

/**
 * A simple wrapper to help with the typing of the event.
 * @param root named parameters
 * @param root.event the event to send
 * @param root.data the data to send
 * @returns the event to send to the client
 */
function createEvent({ data, event }: ChatEvent): SSEMessage {
  return {
    data: JSON.stringify(data),
    event,
  };
}

/**
 * Handle a tool call from the orchestrator
 * @param root named parameters
 * @param root.spaceID The space ID associated with the chat
 * @param root.tool The tool to call
 * @param root.traceID The trace ID associated with the chat
 * @param root.userID The user ID associated with the chat
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
