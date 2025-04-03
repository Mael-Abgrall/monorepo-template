import type { EventSourceController } from 'event-source-plus';
import type {
  Conversation,
  GetConversationResponse,
  ListConversationsResponse,
  Message,
  PostChatBody,
  PostChatEvent,
} from 'shared/schemas/shared-schemas-chat';
import { EventSourcePlus } from 'event-source-plus';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { logger } from 'web-utils/reporting';
import { apiFetch } from '../fetch';
import { useAuthStore } from './app-stores-auth';

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
  const streamController = ref<EventSourceController | undefined>(undefined);
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
   * @param root.conversationID (optional) the conversation ID to connect to
   * @param root.prompt the prompt to send to the conversation
   */
  async function createConversation({
    conversationID,
    prompt,
  }: {
    conversationID?: string;
    prompt: string;
  }): Promise<void> {
    const baseURL =
      import.meta.env.MODE === 'development'
        ? 'http://localhost:8787'
        : 'https://api.example.com'; // todo: change to the actual API URL

    const eventSource = new EventSourcePlus(`${baseURL}/chat`, {
      body: JSON.stringify({
        conversationID,
        prompt,
      } satisfies PostChatBody),
      credentials: 'include',
      method: 'post',
    });

    isLoading.value = true;
    streamController.value = eventSource.listen({
      async onMessage(message) {
        try {
          await handleSSEEvent({
            sseMessage: {
              data: JSON.parse(message.data) as PostChatEvent['data'],
              event: message.event,
            } as PostChatEvent,
          });
        } catch (error) {
          logger.error(error);
          await abortConversation();
          conversationError.value = 'Failed to handle SSE event';
        }
      },

      async onRequestError({ error, options: _o, request: _r }) {
        logger.error(error);
        conversationError.value = 'Failed to create conversation';
        await abortConversation();
      },

      async onResponseError({ options: _o, request: _r, response }) {
        if (response.status !== 401) {
          logger.error('Not a 401 error');
          await abortConversation();
          return;
        }
        const authStore = useAuthStore();
        const isLoggedIn = await authStore.refreshToken();
        if (!isLoggedIn) {
          await abortConversation();
        }
        // automatic retry
      },
    });
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
    conversationError,
    conversations,
    createConversation,
    currentConversation,
    currentConversationID,
    currentConversationMessages,
    fetchConversation,
    isLoading,
    listConversations,
  };
});
