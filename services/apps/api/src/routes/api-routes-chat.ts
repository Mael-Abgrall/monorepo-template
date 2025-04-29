import type { Environment } from 'service-utils/environment';
import type {
  Chat,
  ChatEvent,
  ListChatsInSpaceResponse,
} from 'shared/schemas/shared-schemas-chat';
import {
  completeNewChat,
  completeNewMessage,
  getChat,
  listChatsInSpace,
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
  chatSchema,
  getChatParametersSchema,
  listChatsInSpaceParametersSchema,
  listChatsInSpaceResponseSchemas,
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

- If the chatID is undefined, a new chat will be created, and a "create" event will be sent.
- If the chatID is provided, the API will append the new message to the chat.
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
    const { chatID, prompt, spaceID } = context.req.valid('json');
    return streamSSE(
      context,
      async (stream) => {
        try {
          if (!chatID) {
            await completeNewChat({
              prompt,
              spaceID,
              sseStream: stream,
              userID: context.get('userID'),
            });
            await flushAnalytics();
            return;
          }
          await completeNewMessage({
            chatID,
            prompt,
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
          } satisfies ChatEvent);
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
        } satisfies ChatEvent);
        await flushAnalytics();
        await stream.close();
      },
    );
  },
);

chatRouter.get(
  '/list/in-space/:spaceID',
  describeRoute({
    description: 'List all chats for the user',
    responses: {
      200: {
        content: {
          'application/json': {
            schema: listChatsInSpaceResponseSchemas,
          },
        },
        description: 'The list of chats',
      },
    },
    tags: ['Chat'],
    validateResponse: true,
  }),
  validator('param', listChatsInSpaceParametersSchema),
  async (context) => {
    const { spaceID } = context.req.valid('param');
    const chats = await listChatsInSpace({
      spaceID,
      userID: context.get('userID'),
    });

    return context.json(
      validateResponse({
        // @ts-expect-error need to update types for ours
        response: chats satisfies ListChatsInSpaceResponse,
        schema: listChatsInSpaceResponseSchemas,
      }),
    );
  },
);

chatRouter.get(
  '/:chatID',
  describeRoute({
    description: "Get a chat using it's ID",
    responses: {
      200: {
        content: {
          'application/json': {
            schema: chatSchema,
          },
        },
        description: 'The chat',
      },
      404: {
        content: {
          'application/json': {
            schema: genericResponseSchema,
          },
        },
        description: 'The chat was not found',
      },
    },
    tags: ['Chat'],
  }),
  validator('param', getChatParametersSchema),
  async (context) => {
    const { chatID } = context.req.valid('param');
    const chat = await getChat({
      chatID,
      userID: context.get('userID'),
    });
    if (!chat) {
      throw new HTTPException(404, {
        message: 'Chat not found',
      });
    }

    return context.json(
      validateResponse({
        // @ts-expect-error need to update types for ours
        response: chat satisfies Chat,
        schema: chatSchema,
      }),
    );
  },
);

export { chatRouter };
