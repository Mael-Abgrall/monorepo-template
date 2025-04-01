<script setup lang="ts">
import { ref } from 'vue';
import { useConversationStore } from '../../stores/app-store-conversation';
import componentContainmentButton from '../containment/app-component-containment-button.vue';
import {
  iconMic,
  iconOpenDown,
  iconSend,
  iconSources,
  iconStop,
} from '../icons';

const { conversationID } = defineProps<{
  /** The ID of the conversation to use (optional, leave undefined to create a new conversation) */
  conversationID?: string;
}>();

const prompt = ref<string>('');
const conversationStore = useConversationStore();

/**
 * Handle keydown event
 * @param event - Keyboard event
 */
async function handleKeydown(event: KeyboardEvent): Promise<void> {
  // If shift + enter, allow default behavior (new line)
  if (event.key === 'Enter' && !event.shiftKey) {
    await sendMessage();
  }
}

/**
 * Send the message to the server, and handle the stream response
 */
async function sendMessage(): Promise<void> {
  if (prompt.value.trim().length === 0) {
    return;
  }
  const promptValue = globalThis.structuredClone(prompt.value.trim());
  prompt.value = '';
  await conversationStore.createConversation({
    conversationID: conversationID,
    prompt: promptValue,
  });
}
</script>

<template>
  <form class="chat-box" @submit.prevent="sendMessage">
    <textarea
      id="story"
      name="story"
      rows="5"
      cols="33"
      placeholder="Ask anything..."
      autocomplete="off"
      spellcheck="false"
      v-model="prompt"
      @keydown="handleKeydown"
    ></textarea>
    <div class="chat-box-footer">
      <div class="footer-group">
        <div class="sources">
          <componentContainmentButton variant="outline">
            <iconSources />
            Sources
            <iconOpenDown />
          </componentContainmentButton>
        </div>
      </div>
      <div class="footer-group">
        <button class="button-send" type="button">
          <componentContainmentButton size="icon" variant="secondary">
            <iconMic />
          </componentContainmentButton>
        </button>
        <button
          type="submit"
          :disabled="prompt.length === 0"
          v-if="!conversationStore.isLoading"
        >
          <componentContainmentButton
            size="icon-rounded"
            variant="primary"
            :disabled="prompt.length === 0"
          >
            <iconSend />
          </componentContainmentButton>
        </button>

        <div
          v-if="conversationStore.isLoading"
          @click="conversationStore.abortConversation"
        >
          <componentContainmentButton size="icon-rounded" variant="destructive">
            <iconStop />
          </componentContainmentButton>
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped>
.messages {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  @apply p-4;

  .message {
    @apply rounded-2xl p-2 bg-stone-200;
  }
}

.chat-box {
  display: flex;
  flex-direction: column;
  border: 1px solid;
  @apply border-stone-300 rounded-2xl shadow;

  textarea {
    outline: none;
    resize: none;
    @apply text-stone-900 placeholder:text-stone-400 bg-transparent rounded-t-2xl p-4;
  }

  .chat-box-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    @apply bg-transparent rounded-b-2xl px-4 pb-4;

    .footer-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  }
}

.sources {
  display: flex;
}
</style>
