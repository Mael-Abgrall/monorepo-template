import type { Environment } from 'service-utils/environment';
import type {
  Conversation,
  ListConversationsResponse,
  PostConversationErrorEvent,
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
import { getContextLogger } from 'service-utils/logger';
import { genericResponseSchema } from 'shared/schemas/shared-schemas';
import {
  ConversationSchema,
  getConversationParametersSchema,
  listConversationsResponseSchema,
  PostConversationBodySchema,
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
  '',
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
    summary: 'Answer the user prompt, and stream the response to the user.',
    tags: ['Chat'],
  }),
  validator('json', PostConversationBodySchema),
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
    const { conversationID, prompt } = context.req.valid('json');
    return streamSSE(
      context,
      async (stream) => {
        if (!conversationID) {
          await completeNewConversation({
            prompt,
            sseStream: stream,
            userID: context.get('userID'),
          });
          return;
        }
        await completeNewMessage({
          conversationID,
          prompt,
          sseStream: stream,
          userID: context.get('userID'),
        });
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
  '/:conversationID',
  describeRoute({
    description: 'Get a conversation by ID',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: ConversationSchema,
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
    const conversation = await getConversation({ conversationID });
    if (!conversation) {
      throw new HTTPException(404, {
        message: 'Conversation not found',
      });
    }

    return context.json(
      validateResponse({
        response: conversation satisfies Conversation,
        schema: ConversationSchema,
      }),
    );
  },
);

export { chatRouter };
