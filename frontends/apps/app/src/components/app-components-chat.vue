<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useConversationStore } from '../stores/app-store-conversation';

const conversationStore = useConversationStore();

const { currentConversation, currentConversationMessages } =
  storeToRefs(conversationStore);
</script>

<template>
  <div v-if="currentConversation">
    <div class="title">
      {{ currentConversation.title }}
    </div>
    <!-- <div class="metadata">
      <div class="thinking">
        <div
          class="thinking-step"
          v-for="thinkingStep of currentConversation.messages.thinkingSteps"
        >
          {{ thinkingStep }}
        </div>
      </div>
      <div class="sources">
        {{ currentConversation.messages.sources }}
      </div>
    </div> -->
    <div class="message" v-for="message of currentConversationMessages">
      <div class="prompt">
        {{ message.prompt }}
      </div>
      <div class="response">
        {{ message.response }}
      </div>
    </div>
  </div>
  <div v-else></div>
</template>

<style scoped>
.title {
  font-weight: 600;
  @apply text-2xl;
}

.prompt {
  display: flex;
  border: 1px solid;
  @apply border-stone-300;
}
</style>
