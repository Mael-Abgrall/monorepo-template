import type { Environment } from 'service-utils/environment';
import type {
  GetConversationResponse,
  ListConversationsResponse,
  PostChatErrorEvent,
} from 'shared/schemas/shared-schemas-chat';
import {
  completeNewConversation,
  completeNewMessage,
  getConversation,
  listConversations,
} from 'core/chat';
import { Hono } from 'hono';
import { describeRoute } from 'hono-openapi';
import { validator } from 'hono-openapi/typebox';
import { HTTPException } from 'hono/http-exception';
import { streamSSE } from 'hono/streaming';
import { analytics, flushAnalytics } from 'service-utils/analytics';
import { getContextLogger } from 'service-utils/logger';
import { genericResponseSchema } from 'shared/schemas/shared-schemas';
import {
  getConversationParametersSchema,
  getConversationResponseSchema,
  listConversationsResponseSchema,
  postChatBodySchema,
} from 'shared/schemas/shared-schemas-chat';
import type { Variables } from '../context';
import { validateResponse } from '../helpers/api-helpers-response-validator';
import { authMiddleware } from '../middleware/api-middleware-auth';

const logger = getContextLogger('api-routes-chat.ts');

const chatRouter = new Hono<{
  Bindings: Environment;
  Variables: Variables;
}>();

chatRouter.use(authMiddleware);

chatRouter.post(
  '/text',
  describeRoute({
    description: `
Answer the user prompt, and stream the response to the user.

The stream is done using SSE, and will send back various events defined in the shared schemas.

The API will behave differently depending on the input parameters:

- If the conversationID is undefined, a new conversation will be created, and a "create" event will be sent.
- If the conversationID is provided, the API will append the new message to the conversation.
`,
    responses: {
      200: {
        description: 'SSE stream established',
      },
      401: {
        description: 'Unauthorized - User is not authenticated',
      },
    },
    tags: ['Chat'],
  }),
  validator('json', postChatBodySchema),
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
  - The client could decide at any time to abort the processing (=/= an error or a close from the stream) -> require a new endpoint

*/
    const { conversationID, prompt, spaceID } = context.req.valid('json');
    return streamSSE(
      context,
      async (stream) => {
        try {
          if (!conversationID) {
            await completeNewConversation({
              prompt,
              spaceID,
              sseStream: stream,
              userID: context.get('userID'),
            });
            await flushAnalytics();
            return;
          }
          await completeNewMessage({
            conversationID,
            prompt,
            spaceID,
            sseStream: stream,
            userID: context.get('userID'),
          });
          await flushAnalytics();
        } catch (error) {
          logger.error(error);
          analytics.captureException(error, context.get('userID'));
          await stream.writeSSE({
            data: 'error',
            event: 'error',
          } satisfies PostChatErrorEvent);
          await flushAnalytics();
          await stream.close();
        }
      },
      async (error, stream) => {
        logger.error('error while streaming');
        logger.error(error);
        await stream.writeSSE({
          data: 'error',
          event: 'error',
        } satisfies PostChatErrorEvent);
        await flushAnalytics();
        await stream.close();
      },
    );
  },
);

chatRouter.get(
  '/list',
  describeRoute({
    description: 'List all conversations for the user',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: listConversationsResponseSchema,
          },
        },
        description: 'The list of conversations',
      },
    },
    tags: ['Chat'],
    validateResponse: true,
  }),
  async (context) => {
    const conversations = await listConversations({
      userID: context.get('userID'),
    });

    return context.json(
      validateResponse({
        response: conversations satisfies ListConversationsResponse,
        schema: listConversationsResponseSchema,
      }),
    );
  },
);

chatRouter.get(
  '/conversation/:conversationID',
  describeRoute({
    description: 'Get a conversation by ID, and the associated messages',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: getConversationResponseSchema,
          },
        },
        description: 'The conversation',
      },
      404: {
        content: {
          'application/json': {
            schema: genericResponseSchema,
          },
        },
        description: 'The conversation was not found',
      },
    },
    tags: ['Chat'],
  }),
  validator('param', getConversationParametersSchema),
  async (context) => {
    const { conversationID } = context.req.valid('param');
    const conversationAndMessages = await getConversation({
      conversationID,
      userID: context.get('userID'),
    });
    if (!conversationAndMessages) {
      throw new HTTPException(404, {
        message: 'Conversation not found',
      });
    }

    return context.json(
      validateResponse({
        response: conversationAndMessages satisfies GetConversationResponse,
        schema: getConversationResponseSchema,
      }),
    );
  },
);

export { chatRouter };
