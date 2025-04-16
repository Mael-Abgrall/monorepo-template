<!--
notes:
- make the prompt stand out from the generation (eg; ides have a lighter box)
- reduce the size of the input after the first chat; resize it on typing
- While the sources should be collapsed, they should be pro-eminent
- Displaying the step by step will be important

-->
<script setup lang="ts">
import { useConversationStore } from '../../stores/app-store-conversation';
import componentChatHistory from './app-component-chat-history.vue';
import componentChatInput from './app-components-chat-input.vue';
import componentChatPrompt from './app-components-chat-prompt.vue';
import componentChatResponse from './app-components-chat-response.vue';

const { spaceID } = defineProps<{
  /**
   * The ID of the space where the chat is taking place
   */
  spaceID: string | undefined;
}>();

const conversationStore = useConversationStore();
</script>

<template>
  <div class="chat-container">
    <componentChatHistory :spaceID="spaceID" />
    <div class="conversation">
      <div
        class="message"
        v-for="message of conversationStore.currentConversationMessages"
      >
        <componentChatPrompt :message="message" />
        <componentChatResponse :message="message" />
      </div>
    </div>
    <componentChatInput :spaceID="spaceID" />
  </div>
</template>

<style lang="css" scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  border: 1px solid;
  @apply p-2 bg-stone-100 shadow-xl;
}

.conversation {
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
