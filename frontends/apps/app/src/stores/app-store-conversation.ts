import type {
  Conversation,
  GetConversationResponse,
  ListConversationsResponse,
  Message,
  PostChatBody,
  PostChatEvent,
} from 'shared/schemas/shared-schemas-chat';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { logger } from 'web-utils/reporting';
import { apiFetch } from '../helpers/app-helpers-fetch';
import { sseStream } from '../helpers/app-helpers-stream';

interface Conversations {
  [conversationID: string]: Conversation;
}
interface Messages {
  [messageID: string]: Message;
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversations>({});
  const messages = ref<Messages>({});

  const isLoading = ref(false);
  const conversationError = ref<string | undefined>(undefined);
  const streamController = ref<AbortController | undefined>(undefined);
  /** Define which conversation the user is currently interacting with */
  const currentConversationID = ref<string | undefined>(undefined);

  /**
   * Handle the SSE events.
   * @param root named parameters
   * @param root.sseMessage the SSE event
   */
  async function handleSSEEvent({
    sseMessage,
  }: {
    sseMessage: PostChatEvent;
  }): Promise<void> {
    switch (sseMessage.event) {
      case 'close': {
        await abortConversation();
        return;
      }

      case 'completion': {
        const messageID = sseMessage.data.messageID;
        const completion = sseMessage.data.completion;
        if (
          messages.value[messageID].response &&
          messages.value[messageID].response.length > 0
        ) {
          messages.value[messageID].response += completion;
        } else {
          messages.value[messageID].response = completion;
        }
        return;
      }

      case 'create-conversation': {
        const { conversationID, messageID } = sseMessage.data.message;
        conversations.value[conversationID] = sseMessage.data.conversation;
        messages.value[messageID] = sseMessage.data.message;
        currentConversationID.value = conversationID;
        return;
      }

      case 'create-message': {
        const { messageID } = sseMessage.data;
        messages.value[messageID] = sseMessage.data;
        return;
      }

      case 'error': {
        await abortConversation();
        conversationError.value =
          'An issue occurred while processing your request';
        return;
      }

      default: {
        logger.error(`Unknown message: ${JSON.stringify(sseMessage)}`);
        return;
      }
    }
  }

  /**
   * Connect to the conversation SSE endpoint.
   * @param root named parameters
   * @param root.prompt the prompt to send to the conversation
   */
  async function chat({ prompt }: { prompt: string }): Promise<void> {
    const baseURL =
      import.meta.env.MODE === 'development'
        ? 'http://localhost:8787'
        : 'https://api.example.com'; // todo: change to the actual API URL

    isLoading.value = true;
    try {
      streamController.value = new AbortController();
      const stream = sseStream<PostChatEvent>({
        body: {
          conversationID: currentConversationID.value,
          prompt,
        } satisfies PostChatBody,
        method: 'POST',
        signal: streamController.value.signal,
        url: `${baseURL}/chat`,
      });

      for await (const event of stream) {
        await handleSSEEvent({
          sseMessage: event,
        });
      }
    } catch (error) {
      logger.error(error);
      conversationError.value = 'An error occurred during the conversation';
      await abortConversation();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Abort the conversation stream.
   */
  async function abortConversation(): Promise<void> {
    isLoading.value = false;
    streamController.value?.abort();
  }

  /**
   * List all conversations from the server.
   * @param forceRefresh If true, the conversations will be fetched from the server even if they are already in the store
   */
  async function listConversations(forceRefresh = false): Promise<void> {
    if (!forceRefresh && Object.keys(conversations.value).length > 0) {
      return;
    }
    try {
      const response = await apiFetch<ListConversationsResponse>(
        '/chat/conversations',
      );
      for (const conversation of response) {
        conversations.value[conversation.conversationID] = {
          ...conversation,
          createdAt: new Date(conversation.createdAt),
        };
      }
    } catch (error) {
      logger.error(error);
      conversationError.value = 'Failed to list conversations';
    }
  }

  /**
   * Fetch a conversation from the server.
   * @param root named parameters
   * @param root.conversationID the conversation ID to fetch
   */
  async function fetchConversation({
    conversationID,
  }: {
    conversationID: string;
  }): Promise<void> {
    isLoading.value = true;
    try {
      const response = await apiFetch<GetConversationResponse>(
        `/chat/conversation/${conversationID}`,
      );
      conversations.value[conversationID] = response.conversation;
      for (const message of response.messages) {
        messages.value[message.messageID] = message;
      }
    } catch (error) {
      logger.error(error);
      conversationError.value = 'Failed to fetch conversation';
    } finally {
      isLoading.value = false;
    }
  }

  const currentConversation = computed(() => {
    if (!currentConversationID.value) {
      return undefined;
    }
    return conversations.value[currentConversationID.value];
  });

  const currentConversationMessages = computed(() => {
    if (!currentConversationID.value) {
      return [];
    }
    return Object.values(messages.value).filter((message) => {
      return message.conversationID === currentConversationID.value;
    });
  });

  return {
    abortConversation,
    chat,
    conversationError,
    conversations,
    currentConversation,
    currentConversationID,
    currentConversationMessages,
    fetchConversation,
    isLoading,
    listConversations,
    messages,
  };
});
