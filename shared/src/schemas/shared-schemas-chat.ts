import type { Static } from '@sinclair/typebox';
import { Type } from '@sinclair/typebox';
import type { LanguageModelMessage } from '../../../services/packages/ai/src/providers/lm/interfaces';

export const chatSchema = Type.Object(
  {
    chatID: Type.String({
      description: 'The ID of the chat',
    }),
    createdAt: Type.Union([
      Type.Date({
        description: 'The date and time the chat was created',
      }),
      Type.String({
        description: 'The date and time the chat was created',
      }),
    ]),
    messages: Type.Array(
      Type.Object({
        content: Type.Array(
          Type.Object({
            text: Type.Optional(Type.String()),
          }),
        ),
        role: Type.String(),
      }),
      {
        description: 'The messages in the chat',
      },
    ),
    spaceID: Type.Optional(
      Type.String({
        description: 'The ID of the space the chat belongs to',
      }),
    ),
    updatedAt: Type.Union([
      Type.Date({
        description: 'The date and time the chat was last updated',
      }),
      Type.String({
        description: 'The date and time the chat was last updated',
      }),
    ]),
    userID: Type.String({
      description: 'The ID of the user who created the chat',
    }),
  },
  {
    additionalProperties: false,
    description: 'A chat',
  },
);
export type Chat = Static<typeof chatSchema>;

export const postChatBodySchema = Type.Object(
  {
    chatID: Type.Optional(
      Type.String({
        description:
          'The ID of the chat to continue. Leave empty to create a new chat.',
      }),
    ),
    prompt: Type.String({
      description: "The user's prompt to send to the chat",
      minLength: 1,
    }),
    spaceID: Type.Optional(
      Type.String({
        description: 'The ID of the space the chat belongs to',
      }),
    ),
  },
  {
    additionalProperties: false,
  },
);

export const getChatParametersSchema = Type.Object(
  {
    chatID: Type.String({
      description: 'The ID of the chat to get',
    }),
  },
  {
    additionalProperties: false,
  },
);

export const listChatsInSpaceParametersSchema = Type.Object(
  {
    spaceID: Type.String({
      description: 'The ID of the space to list the chats from',
    }),
  },
  {
    additionalProperties: false,
  },
);
export type ListChatsInSpaceParameters = Static<
  typeof listChatsInSpaceParametersSchema
>;
export const listChatsInSpaceResponseSchemas = Type.Array(chatSchema);

export type ChatEvent =
  | ChatCloseEvent
  | ChatCompletionEvent
  | ChatErrorEvent
  | NewChatEvent
  | NewMessageEvent;

export type ListChatsInSpaceResponse = Static<
  typeof listChatsInSpaceResponseSchemas
>;

export type PostChatBody = Static<typeof postChatBodySchema>;

/** An event sent to indicate the chat is finished. */
interface ChatCloseEvent {
  data: string;
  event: 'close';
}

/** An event with a part of the response from the chat, to be used for real time interface updates. */
interface ChatCompletionEvent {
  data: {
    chatID: Chat['chatID'];
    completion: string;
  };
  event: 'completion';
}

/** Indicate the server had an error. */
interface ChatErrorEvent {
  data: string;
  event: 'error';
}

/** Indicates the creation of a new chat in the DB */
interface NewChatEvent {
  data: Chat;
  event: 'new-chat';
}

/** Indicates the creation of a new message in a chat */
interface NewMessageEvent {
  data: {
    chatID: Chat['chatID'];
    message: LanguageModelMessage;
  };
  event: 'new-message';
}
