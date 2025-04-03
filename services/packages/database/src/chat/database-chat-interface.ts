import type { Conversation, Message } from './database-chat-schemas';
import { createConversation } from './database-chat-conversation';
import { createMessage } from './database-chat-message';

export {
  deleteConversation,
  getConversation,
  listConversations,
  updateConversation,
} from './database-chat-conversation';
export {
  createMessage as addMessageToConversation,
  deleteMessage as removeMessageFromConversation,
  updateMessage as updateMessageInConversation,
} from './database-chat-message';
export type {
  Conversation as ConversationInDB,
  Message as MessageInDB,
} from './database-chat-schemas';

// todo: get Message from Conversation

/**
 * Initialize a new conversation with a prompt
 * @param root named parameters
 * @param root.prompt The prompt for the conversation
 * @param root.title The title of the conversation
 * @param root.userID The user ID owner of the conversation
 * @returns The created conversation and message
 */
export async function initConversation({
  prompt,
  title,
  userID,
}: {
  prompt: string;
  title: string;
  userID: string;
}): Promise<{ conversation: Conversation; message: Message }> {
  const conversation = await createConversation({ title, userID });
  const message = await createMessage({
    conversationID: conversation.conversationID,
    prompt,
    userID,
  });
  return { conversation, message };
}
