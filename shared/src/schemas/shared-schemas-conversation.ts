import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';

export const PostConversationBodySchema = Type.Object({
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
});
export type PostConversationBody = Static<typeof PostConversationBodySchema>;

export const ConversationSchema = Type.Object({
  conversationID: Type.String({
    description: 'The ID of the conversation',
  }),
  messages: Type.Object({
    createdAt: Type.String({
      description: 'The date and time the message was created',
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
            description: 'The origin of the source',
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
    thinkingSteps: Type.Optional(
      Type.Array(
        Type.String({
          description: 'The steps of the thinking process',
        }),
      ),
    ),
  }),
  title: Type.String({
    description: 'The title of the conversation',
  }),
});
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
  | PostConversationSourcesEvent
  | PostConversationThinkingEvent;
/** An event with the sources selected for the response. */
export interface PostConversationSourcesEvent {
  data: {
    conversationID: Conversation['conversationID'];
    sources: Conversation['messages']['sources'];
  };
  event: 'sources';
}
/** An event with the steps that will be used to generate the response. */
export interface PostConversationThinkingEvent {
  data: {
    conversationID: Conversation['conversationID'];
    thinkingSteps: Conversation['messages']['thinkingSteps'];
  };
  event: 'thinking';
}
