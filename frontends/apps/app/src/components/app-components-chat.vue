<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useConversationStore } from '../stores/app-store-conversation';

const conversationStore = useConversationStore();

const { currentConversation } = storeToRefs(conversationStore);
</script>

<template>
  <div v-if="currentConversation">
    <div class="title">
      {{ currentConversation.title }}
    </div>
    <div class="metadata">
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
    </div>
    <div class="response">
      {{ currentConversation.messages.response }}
    </div>
  </div>
  <div v-else></div>
</template>
