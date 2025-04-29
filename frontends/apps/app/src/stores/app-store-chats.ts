import type {
  Chat,
  ChatEvent,
  ListChatsInSpaceResponse,
  PostChatBody,
} from 'shared/schemas/shared-schemas-chat';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { apiFetch } from '../helpers/app-helpers-fetch';
import { logger } from '../helpers/app-helpers-reporting';
import { sseStream } from '../helpers/app-helpers-stream';

export const useChatsStore = defineStore('chats', () => {
  const chats = ref(new Map<string, Chat>());

  const isLoading = ref(false);
  const chatError = ref<string | undefined>(undefined);
  const streamController = ref<AbortController | undefined>(undefined);
  /** Define which chat the user is currently interacting with */
  const currentChatID = ref<string | undefined>(undefined);

  watch(currentChatID, async (chatID) => {
    if (chatID) {
      await fetchChat({ chatID });
    }
  });

  /**
   * Handle the SSE events.
   * @param root named parameters
   * @param root.sseMessage the SSE event
   */
  async function handleSSEEvent({
    sseMessage,
  }: {
    sseMessage: ChatEvent;
  }): Promise<void> {
    switch (sseMessage.event) {
      case 'close': {
        await abortChatStream();
        return;
      }

      case 'completion': {
        const { chatID, completion } = sseMessage.data;
        const chat = chats.value.get(chatID);
        if (!chat) {
          throw new Error('Chat not found during a completion event');
        }

        const lastMessage = chat.messages.at(-1);
        if (!lastMessage) {
          throw new Error('Chat has no messages during a completion event');
        }
        if (!lastMessage.content[0].text) {
          throw new Error('Last message has no text during a completion event');
        }

        lastMessage.content[0].text += completion;

        chats.value.set(chatID, {
          ...chat,
          messages: [...chat.messages.slice(0, -1), lastMessage],
        });
        return;
      }

      case 'error': {
        await abortChatStream();
        chatError.value = 'An issue occurred while processing your request';
        return;
      }

      case 'new-chat': {
        const chat = sseMessage.data;
        chats.value.set(chat.chatID, chat);
        currentChatID.value = chat.chatID;
        return;
      }

      case 'new-message': {
        const { chatID, message } = sseMessage.data;
        // @ts-expect-error need to update types for ours
        chats.value.get(chatID)?.messages.push(message);
        return;
      }

      default: {
        logger.error(`Unknown message: ${JSON.stringify(sseMessage)}`);
        return;
      }
    }
  }

  /**
   * Connect to the chat SSE endpoint and complete a chat.
   * @param root named parameters
   * @param root.prompt the prompt to send to the chat
   * @param root.spaceID the ID of the space where the chat is taking place
   */
  async function complete({
    prompt,
    spaceID,
  }: {
    prompt: string;
    spaceID: string | undefined;
  }): Promise<void> {
    isLoading.value = true;
    try {
      streamController.value = new AbortController();
      const stream = sseStream<ChatEvent>({
        body: {
          chatID: currentChatID.value,
          prompt,
          spaceID,
        } satisfies PostChatBody,
        method: 'POST',
        signal: streamController.value.signal,
        url: '/chat/text',
      });

      for await (const event of stream) {
        await handleSSEEvent({
          sseMessage: event,
        });
      }
    } catch (error) {
      logger.error(error);
      chatError.value = 'An error occurred during the chat';
      await abortChatStream();
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Abort the chat stream.
   */
  async function abortChatStream(): Promise<void> {
    isLoading.value = false;
    // todo: abort the stream?
    // streamController.value?.abort();
  }

  /**
   * List all chats within a space from the server.
   * @param root named parameters
   * @param root.spaceID the ID of the space
   */
  async function listChatsInSpace({
    spaceID,
  }: {
    spaceID: string;
  }): Promise<void> {
    try {
      const response = await apiFetch<ListChatsInSpaceResponse>(
        `/chat/list/in-space/${spaceID}`,
      );
      for (const chat of response) {
        chats.value.set(chat.chatID, {
          ...chat,
          createdAt: new Date(chat.createdAt),
        });
      }
    } catch (error) {
      logger.error(error);
      chatError.value = 'Failed to list chats';
    }
  }

  /**
   * Fetch a chat from the server.
   * @param root named parameters
   * @param root.chatID the chat ID to fetch
   * @param root.force If true, the chat will be fetched from the server even if it is already in the store
   */
  async function fetchChat({
    chatID,
    force = false,
  }: {
    chatID: string;
    force?: boolean;
  }): Promise<void> {
    if (!force && chats.value.has(chatID)) {
      return;
    }

    isLoading.value = true;
    try {
      const response = await apiFetch<Chat>(`/chat/${chatID}`);
      chats.value.set(chatID, response);
    } catch (error) {
      logger.error(error);
      chatError.value = 'Failed to fetch chat';
    } finally {
      isLoading.value = false;
    }
  }

  const currentChat = computed(() => {
    return chats.value.get(currentChatID.value ?? '');
  });

  return {
    abortChatStream,
    chatError,
    chats,
    complete,
    currentChat,
    currentChatID,
    fetchChat,
    isLoading,
    listChatsInSpace,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useChatsStore, import.meta.hot));
}
