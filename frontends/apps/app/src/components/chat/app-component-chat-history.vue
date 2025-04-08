<script setup lang="ts">
import { useConversationStore } from '../../stores/app-store-conversation';

const conversationStore = useConversationStore();

const selectConversation = (conversationID: string | undefined): void => {
  conversationStore.currentConversationID = conversationID;
};
</script>

<template>
  <select
    v-model="conversationStore.currentConversationID"
    @change="selectConversation(conversationStore.currentConversationID)"
    class="conversation-select"
  >
    <option value="" disabled>Select a conversation</option>
    <option :value="undefined">New conversation</option>
    <option
      v-for="(conversation, id) of conversationStore.conversations"
      :key="id"
      :value="id"
    >
      {{
        Object.values(conversationStore.messages)
          .find((message) => message.conversationID === id)
          ?.prompt.slice(0, 50)
      }}
    </option>
  </select>
</template>

<style scoped></style>
