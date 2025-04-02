import type { ConversationInDB } from 'database/conversation';
import {
  addMessageToConversation,
  createConversation,
  deleteConversation,
  getConversation,
  updateConversation,
} from 'database/conversation';
import { analytics } from 'service-utils/analytics';
export { getConversation, listConversations } from 'database/conversation';

/**
 * Complete a conversation
 * @param root named parameters
 * @param root.conversationID The conversation ID, or undefined to create a new conversation
 * @param root.prompt The prompt of the user
 * @param root.userID The user ID
 */
export async function completeConversation({
  conversationID,
  prompt,
  userID,
}: {
  conversationID: string | undefined;
  prompt: string;
  userID: string;
}): Promise<void> {
  const startTime = Date.now();
  const conversation = await getOrInitConversation({
    conversationID,
    prompt,
    userID,
  });

  const endTime = Date.now();
  analytics.capture({
    distinctId: userID,
    event: '$ai_trace',
    properties: {
      $ai_latency: (endTime - startTime) / 1000, // in seconds
      $ai_span_name: 'conversation',
      $ai_trace_id: conversationID,
    },
  });
}

/**
 * Get a conversation by ID, or create a new one if it doesn't exist
 * @param root named parameters
 * @param root.conversationID - The ID of the conversation to get
 * @param root.prompt - The prompt to create the conversation with
 * @param root.userID - The ID of the user to create the conversation for
 * @returns The conversation
 */
async function getOrInitConversation({
  conversationID,
  prompt,
  userID,
}: {
  conversationID: string | undefined;
  prompt: string;
  userID: string;
}): Promise<ConversationInDB> {
  if (!conversationID) {
    return createConversation({
      prompt,
      title: prompt,
      userID,
    });
  }
  const conversation = await getConversation({ conversationID });
  if (!conversation) {
    throw new Error('Conversation with and ID could not be found');
  }
  return conversation;
}
