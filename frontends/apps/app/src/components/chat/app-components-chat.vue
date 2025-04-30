<!--
notes:
- make the prompt stand out from the generation (eg; ides have a lighter box)
- reduce the size of the input after the first chat; resize it on typing
- While the sources should be collapsed, they should be pro-eminent
- Displaying the step by step will be important

-->
<script setup lang="ts">
import { useChatsStore } from '../../stores/app-store-chats';
import { iconSpinner } from '../icons';
import componentChatHistory from './app-component-chat-history.vue';
import componentChatInput from './app-components-chat-input.vue';
import componentChatPrompt from './app-components-chat-prompt.vue';
import componentChatResponse from './app-components-chat-response.vue';
import componentChatUnknownContent from './app-components-chat-unknown-content.vue';

const { spaceID } = defineProps<{
  /**
   * The ID of the space where the chat is taking place
   */
  spaceID: string | undefined;
}>();

const chatStore = useChatsStore();
</script>

<template>
  <div class="chat-container">
    <componentChatHistory :spaceID="spaceID" />
    <div class="chat">
      <div class="message" v-for="message of chatStore.currentChat?.messages">
        <template v-for="content of message.content">
          <componentChatPrompt
            v-if="message.role === 'user' && content.text"
            :text="content.text"
          />
          <componentChatResponse
            v-else-if="message.role === 'assistant' && content.text"
            :text="content.text"
          />
          <componentChatUnknownContent v-else :content="content" />
        </template>
      </div>
      <div class="loading" v-if="chatStore.isLoading">
        <iconSpinner />
      </div>
      <div class="error" v-if="chatStore.chatError">
        {{ chatStore.chatError }}
      </div>
    </div>
    <componentChatInput :spaceID="spaceID" />
  </div>
</template>

<style lang="css" scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  min-width: 100%;
  max-width: 120ch;
  @apply p-2 bg-stone-100 shadow-xl;
}

.chat {
  display: flex;
  flex-direction: column;
  @apply gap-6;

  .message {
    display: flex;
    flex-direction: column;
    @apply gap-4;
  }
}
</style>
