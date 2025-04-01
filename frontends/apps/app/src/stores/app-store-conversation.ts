import type { EventSourceController } from 'event-source-plus';
import type {
  Conversation,
  PostConversationBody,
  PostConversationEvent,
} from 'shared/schemas/shared-schemas-conversation';
import { EventSourcePlus } from 'event-source-plus';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { logger } from 'web-utils/reporting';
import { useAuthStore } from './app-stores-auth';

interface Conversations {
  [key: string]: Conversation;
}

export const useConversationStore = defineStore('conversation', () => {
  const conversations = ref<Conversations>({});
  const isLoading = ref(false);
  const conversationError = ref<string | undefined>(undefined);
  const streamController = ref<EventSourceController | undefined>(undefined);
  const currentConversationID = ref<string | undefined>(undefined);

  /**
   * Handle the SSE event, and route it to the associated function.
   * @param root named parameters
   * @param root.message the message event
   */
  async function handleSSEEvent({
    message,
  }: {
    message: PostConversationEvent;
  }): Promise<void> {
    switch (message.event) {
      case 'close': {
        await abortConversation();
        return;
      }
      case 'completion': {
        const conversationID = message.data.conversationID;
        const completion = message.data.completion.trim();
        if (conversations.value[conversationID].messages.response) {
          conversations.value[conversationID].messages.response +=
            ` ${completion}`;
        } else {
          conversations.value[conversationID].messages.response = completion;
        }
        return;
      }
      case 'create': {
        const conversationID = message.data.conversationID;
        conversations.value[conversationID] = message.data;
        currentConversationID.value = conversationID;
        return;
      }
      case 'error': {
        await abortConversation();
        conversationError.value =
          'An issue occurred while processing your request';
        return;
      }
      case 'sources': {
        const conversationID = message.data.conversationID;
        conversations.value[conversationID].messages.sources =
          message.data.sources;
        return;
      }
      case 'thinking': {
        const conversationID = message.data.conversationID;
        conversations.value[conversationID].messages.thinkingSteps =
          message.data.thinkingSteps;
        return;
      }
      default: {
        logger.error(`Unknown message: ${JSON.stringify(message)}`);
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
      } satisfies PostConversationBody),
      credentials: 'include',
      method: 'post',
    });

    isLoading.value = true;
    streamController.value = eventSource.listen({
      async onMessage(message) {
        await handleSSEEvent({
          message: {
            data: JSON.parse(message.data) as PostConversationEvent['data'],
            event: message.event,
          } as PostConversationEvent,
        });
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

  const currentConversation = computed(() => {
    if (!currentConversationID.value) {
      return undefined;
    }
    return conversations.value[currentConversationID.value];
  });

  return {
    abortConversation,
    conversationError,
    conversations,
    createConversation,
    currentConversation,
    currentConversationID,
    isLoading,
  };
});
