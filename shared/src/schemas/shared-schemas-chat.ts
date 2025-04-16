import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

const messageSchema = Type.Object(
  {
    conversationID: Type.String({
      description: 'The ID of the conversation',
    }),
    createdAt: Type.Union([
      Type.Date({
        description: 'The date and time the message was created',
      }),
      Type.String({
        description: 'The date and time the message was created',
      }),
    ]),
    initiatives: Type.Optional(
      Type.Array(
        Type.Object({
          action: Type.String({
            description:
              'The initiative taken by the agent to answer the prompt',
          }),
        }),
      ),
    ),
    messageID: Type.String({
      description: 'The ID of the message',
    }),
    prompt: Type.String({
      description: "The user's prompt",
    }),
    response: Type.Optional(
      Type.String({
        description: 'The response from the conversation',
      }),
    ),
    sources: Type.Optional(
      Type.Array(
        Type.Object({
          chunk: Type.String({
            description: 'The chunk of the source',
          }),
          chunkID: Type.String({
            description: 'The ID of the chunk',
          }),
          documentID: Type.String({
            description: 'The ID of the document',
          }),
          origin: Type.String({
            description: 'Where the source is coming from (e.g. "Website.com")',
          }),
          title: Type.String({
            description: 'The title of the source',
          }),
          url: Type.String({
            description: 'The URL of the source',
          }),
        }),
      ),
    ),
    userID: Type.String({
      description: 'The ID of the user who created the message',
    }),
  },
  {
    additionalProperties: false,
  },
);
export type Message = Static<typeof messageSchema>;

export const conversationSchema = Type.Object(
  {
    conversationID: Type.String({
      description: 'The ID of the conversation',
    }),
    createdAt: Type.Union([
      Type.Date({
        description: 'The date and time the conversation was created',
      }),
      Type.String({
        description: 'The date and time the conversation was created',
      }),
    ]),
    spaceID: Type.Optional(
      Type.String({
        description: 'The ID of the space the conversation belongs to',
      }),
    ),
    userID: Type.String({
      description: 'The ID of the user who created the conversation',
    }),
  },
  {
    additionalProperties: false,
    description: 'A conversation',
  },
);
export type Conversation = Static<typeof conversationSchema>;

export const postChatBodySchema = Type.Object(
  {
    conversationID: Type.Optional(
      Type.String({
        description:
          'The ID of the conversation to continue. Leave empty to create a new conversation.',
      }),
    ),
    prompt: Type.String({
      description: "The user's prompt to send to the conversation",
      minLength: 1,
    }),
    spaceID: Type.Optional(
      Type.String({
        description: 'The ID of the space the conversation belongs to',
      }),
    ),
  },
  {
    additionalProperties: false,
  },
);
export type PostChatBody = Static<typeof postChatBodySchema>;
/** An event sent to indicate the conversation is finished. */
export interface PostChatCloseEvent {
  data: string;
  event: 'close';
}
/** An event with a part of the response from the conversation, to be used for real time interface updates. */
export interface PostChatCompletionEvent {
  data: {
    completion: string;
    messageID: Message['messageID'];
  };
  event: 'completion';
}
/** An event indicating the conversation has been created. */
export interface PostChatCreateConversationEvent {
  data: {
    conversation: Conversation;
    message: Message;
  };
  event: 'create-conversation';
}
/** An event indicating the conversation has been created. */
export interface PostChatCreateMessageEvent {
  data: Message;
  event: 'create-message';
}
/** Indicate the server had an error. */
export interface PostChatErrorEvent {
  data: string;
  event: 'error';
}
export type PostChatEvent =
  | PostChatCloseEvent
  | PostChatCompletionEvent
  | PostChatCreateConversationEvent
  | PostChatCreateMessageEvent
  | PostChatErrorEvent
  | PostChatInitiativeEvent
  | PostChatSourcesEvent;

/** An event with the initiative taken by the agent to answer the prompt. */
export interface PostChatInitiativeEvent {
  data: {
    initiatives: Message['initiatives'];
    messageID: Message['messageID'];
  };
  event: 'initiative';
}
/** An event with the sources selected for the response. */
export interface PostChatSourcesEvent {
  data: {
    messageID: Message['messageID'];
    sources: Message['sources'];
  };
  event: 'sources';
}

export const getConversationParametersSchema = Type.Object({
  conversationID: Type.String({
    description: 'The ID of the conversation',
  }),
});
export type GetConversationParameters = Static<
  typeof getConversationParametersSchema
>;
export const getConversationResponseSchema = Type.Object(
  {
    conversation: conversationSchema,
    messages: Type.Array(messageSchema, {
      description: 'The messages in the conversation',
    }),
  },
  {
    additionalProperties: false,
  },
);
export type GetConversationResponse = Static<
  typeof getConversationResponseSchema
>;

export const listConversationsResponseSchema = Type.Array(conversationSchema, {
  description: 'The list of conversations',
});
export type ListConversationsResponse = Static<
  typeof listConversationsResponseSchema
>;
