import type { SSEMessage, SSEStreamingApi } from 'hono/streaming';
import type { Environment } from 'service-utils/environment';
import type {
  PostConversationCloseEvent,
  PostConversationCompletionEvent,
  PostConversationCreateEvent,
  PostConversationErrorEvent,
  PostConversationEvent,
  PostConversationSourcesEvent,
  PostConversationThinkingEvent,
} from 'shared/schemas/shared-schemas-conversation';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { streamSSE } from 'hono/streaming';
import { getContextLogger } from 'service-utils/logger';
import type { Variables } from '../context';
import { authMiddleware } from '../middleware/api-middleware-auth';

const logger = getContextLogger('api-routes-chat.ts');

const chatRouter = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

chatRouter.use(authMiddleware);

/**
 * A simple wrapper to help with the typing of the event.
 * @param root named parameters
 * @param root.event the event to send
 * @param root.data the data to send
 * @returns the event to send to the client
 */
function createEvent({ data, event }: PostConversationEvent): SSEMessage {
  return {
    data: JSON.stringify(data),
    event,
  };
}

/**
 * Simulate the processing of a conversation.
 * @param root named parameters
 * @param root.conversationID (optional) the conversation ID to use
 * @param root.prompt the prompt to send to the conversation
 * @param root.stream the stream to write to
 */
async function simulateProcessing({
  conversationID,
  prompt,
  stream,
}: {
  conversationID: string | undefined;
  prompt: string;
  stream: SSEStreamingApi;
}): Promise<void> {
  // simulate creation
  await stream.writeSSE(
    createEvent({
      data: {
        conversationID: conversationID ?? '123',
        messages: {
          createdAt: '2021-01-01',
          prompt,
          response: undefined,
          sources: undefined,
          thinkingSteps: undefined,
        },
        title: 'test title',
      },
      event: 'create',
    } satisfies PostConversationCreateEvent),
  );
  await stream.sleep(1000);

  // simulate thinking
  await stream.writeSSE(
    createEvent({
      data: {
        conversationID: '123',
        thinkingSteps: ['thinking step 1', 'thinking step 2'],
      },
      event: 'thinking',
    } satisfies PostConversationThinkingEvent),
  );
  await stream.sleep(1000);

  // simulate sources
  await stream.writeSSE(
    createEvent({
      data: {
        conversationID: '123',
        sources: [
          {
            chunk: 'source chunk',
            chunkID: 'source chunk ID',
            documentID: 'source document ID',
            origin: 'source origin',
            title: 'source title',
            url: 'source url',
          },
          {
            chunk: 'source chunk 2',
            chunkID: 'source chunk ID 2',
            documentID: 'source document ID 2',
            origin: 'source origin 2',
            title: 'source title 2',
            url: 'source url 2',
          },
          {
            chunk: 'source chunk 3',
            chunkID: 'source chunk ID 3',
            documentID: 'source document ID 3',
            origin: 'source origin 3',
            title: 'source title 3',
            url: 'source url 3',
          },
        ],
      },
      event: 'sources',
    } satisfies PostConversationSourcesEvent),
  );
  await stream.sleep(1000);

  // simulate completion
  await stream.writeSSE(
    createEvent({
      data: {
        completion: 'This',
        conversationID: '123',
      },
      event: 'completion',
    } satisfies PostConversationCompletionEvent),
  );
  await stream.sleep(100);
  await stream.writeSSE(
    createEvent({
      data: {
        completion: 'is',
        conversationID: '123',
      },
      event: 'completion',
    } satisfies PostConversationCompletionEvent),
  );
  await stream.sleep(500);
  await stream.writeSSE(
    createEvent({
      data: {
        completion: 'a',
        conversationID: '123',
      },
      event: 'completion',
    } satisfies PostConversationCompletionEvent),
  );
  await stream.sleep(200);
  await stream.writeSSE(
    createEvent({
      data: {
        completion: 'test, to show ',
        conversationID: '123',
      },
      event: 'completion',
    } satisfies PostConversationCompletionEvent),
  );
  await stream.sleep(400);
  await stream.writeSSE(
    createEvent({
      data: {
        completion: 'the completion ',
        conversationID: '123',
      },
      event: 'completion',
    } satisfies PostConversationCompletionEvent),
  );
  await stream.sleep(400);

  // Send a close event to the stream
  await stream.writeSSE(
    createEvent({
      data: 'close',
      event: 'close',
    } satisfies PostConversationCloseEvent),
  );
}

chatRouter.post(
  '',
  describeRoute({
    description:
      'Establishes a Server-Sent Events (SSE) connection for receiving real-time updates.',
    responses: {
      200: {
        description: 'SSE stream established',
      },
      401: {
        description: 'Unauthorized - User is not authenticated',
      },
    },
    summary: 'Server-Sent Events endpoint for real-time updates',
    tags: ['Chat'],
  }),
  async (context) => {
    /*

#################################
####                         ####
##            Notes            ##
####                         ####
#################################

- SSE should reconnect whenever possible, to carry on where the previous stream was closed.
- This mean we need to de-couple the state and processing from the API server to keep it stateless.
  - AKA, the processing should be a worker, regularly updating a state, and that would respond to an abort signal
  - The API would only connect to the state, and report the changes to the client. (figure out how to "subscribe" to the state)
  - The client could decide at any time to abort the processing (=/= an error or a close from the stream)

*/
    return streamSSE(
      context,
      async (stream) => {
        stream.onAbort(async () => {
          logger.info('stream aborted');
          await stream.close();
        });
        logger.info('new stream');

        await simulateProcessing({
          conversationID: undefined,
          prompt: 'test prompt',
          stream,
        });
        logger.info('closing stream');
        await stream.close();
      },
      async (error, stream) => {
        logger.error('error while streaming');
        logger.error(error);
        await stream.writeSSE({
          data: 'error',
          event: 'error',
        } satisfies PostConversationErrorEvent);
        await stream.close();
      },
    );
  },
);

export { chatRouter };
