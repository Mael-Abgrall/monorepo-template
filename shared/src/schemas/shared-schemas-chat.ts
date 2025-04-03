import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const PostConversationBodySchema = Type.Object(
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
  },
  {
    additionalProperties: false,
  },
);
export type PostConversationBody = Static<typeof PostConversationBodySchema>;

export const ConversationSchema = Type.Object(
  {
    conversationID: Type.String({
      description: 'The ID of the conversation',
    }),
    createdAt: Type.Date({
      description: 'The date and time the conversation was created',
    }),
    messages: Type.Array(
      Type.Object({
        createdAt: Type.Date({
          description: 'The date and time the message was created',
        }),
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
                description:
                  'Where the source is coming from (e.g. "Website.com")',
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
      }),
    ),
    title: Type.String({
      description: 'The title of the conversation',
    }),
    userID: Type.String({
      description: 'The ID of the user who created the conversation',
    }),
    visibility: Type.Union([Type.Literal('private'), Type.Literal('public')]),
  },
  {
    additionalProperties: false,
    description: 'A conversation',
  },
);
export type Conversation = Static<typeof ConversationSchema>;

/** An event sent to indicate the conversation is finished. */
export interface PostConversationCloseEvent {
  data: string;
  event: 'close';
}
/** An event with a part of the response from the conversation, to be used for real time interface updates. */
export interface PostConversationCompletionEvent {
  data: {
    completion: string;
    conversationID: Conversation['conversationID'];
    messageID: Conversation['messages'][number]['messageID'];
  };
  event: 'completion';
}
/** An event indicating the conversation has been created. */
export interface PostConversationCreateEvent {
  data: Conversation;
  event: 'create';
}
/** Indicate the server had an error. */
export interface PostConversationErrorEvent {
  data: string;
  event: 'error';
}
export type PostConversationEvent =
  | PostConversationCloseEvent
  | PostConversationCompletionEvent
  | PostConversationCreateEvent
  | PostConversationErrorEvent
  | PostConversationInitiativeEvent
  | PostConversationSourcesEvent;

/** An event with the initiative taken by the agent to answer the prompt. */
export interface PostConversationInitiativeEvent {
  data: {
    conversationID: Conversation['conversationID'];
    initiatives: string;
    messageID: Conversation['messages'][number]['messageID'];
  };
  event: 'initiative';
}

/** An event with the sources selected for the response. */
export interface PostConversationSourcesEvent {
  data: {
    conversationID: Conversation['conversationID'];
    messageID: Conversation['messages'][number]['messageID'];
    sources: Conversation['messages'][number]['sources'];
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

export const listConversationsResponseSchema = Type.Array(
  Type.Object({
    conversationID: Type.String({
      description: 'The ID of the conversation',
    }),
    createdAt: Type.Date({
      description: 'The date and time the conversation was created',
    }),
    title: Type.String({
      description: 'The title of the conversation',
    }),
    userID: Type.String({
      description: 'The ID of the user who created the conversation',
    }),
    visibility: Type.Union([Type.Literal('private'), Type.Literal('public')]),
  }),
  {
    additionalProperties: false,
    description: 'The list of conversations',
  },
);
export type ListConversationsResponse = Static<
  typeof listConversationsResponseSchema
>;
