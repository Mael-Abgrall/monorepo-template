<script setup lang="ts">
import { useChatsStore } from '../../stores/app-store-chats';

const { spaceID } = defineProps<{
  /**
   * The ID of the space where the chat is taking place
   */
  spaceID: string | undefined;
}>();

const chatStore = useChatsStore();

const selectChat = (chatID: string | undefined): void => {
  chatStore.currentChatID = chatID;
};
</script>

<template>
  <div class="history">
    History:
    <select
      v-model="chatStore.currentChatID"
      @change="selectChat(chatStore.currentChatID)"
    >
      <option value="" disabled>Select a chat</option>
      <option :value="undefined">New chat</option>
      <template v-if="spaceID">
        <template v-for="[chatID, chat] of chatStore.chats" :key="chatID">
          <option
            :value="chatID"
            v-if="chat.spaceID === spaceID && chat.messages.length > 0"
          >
            {{ chat.messages[0].content.at(0)!.text }}
          </option>
        </template>
      </template>
      <template v-else>
        <option
          v-for="[chatID, chat] of chatStore.chats"
          :key="chatID"
          :value="chatID"
        >
          {{ chat.messages[0].content.at(0)!.text }}
        </option>
      </template>
    </select>
  </div>
</template>

<style scoped>
.history {
  display: flex;
  align-items: center;

  @apply gap-1 pb-4;

  select {
    flex: 1;
    overflow-y: hidden;
    @apply bg-stone-200 rounded p-1;
  }
}
</style>
