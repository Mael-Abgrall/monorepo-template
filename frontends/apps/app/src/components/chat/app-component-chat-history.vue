<script setup lang="ts">
import { useConversationStore } from '../../stores/app-store-conversation';

const { spaceID } = defineProps<{
  /**
   * The ID of the space where the chat is taking place
   */
  spaceID: string | undefined;
}>();

const conversationStore = useConversationStore();

const selectConversation = (conversationID: string | undefined): void => {
  conversationStore.currentConversationID = conversationID;
};
</script>

<template>
  <div>
    <template
      v-for="conversation of conversationStore.conversations"
      :key="conversation.conversationID"
    >
      {{ conversation.createdAt }}
      {{ conversation.conversationID }}
      {{ conversation.spaceID }}
      <div
        :value="conversation.conversationID"
        v-if="conversation.spaceID === spaceID"
      >
        {{ conversation }}
        {{
          Object.values(conversationStore.messages)
            .find(
              (message) =>
                message.conversationID === conversation.conversationID,
            )
            ?.prompt.slice(0, 50)
        }}
      </div>
    </template>
  </div>

  <select
    v-model="conversationStore.currentConversationID"
    @change="selectConversation(conversationStore.currentConversationID)"
    class="conversation-select"
  >
    <option value="" disabled>Select a conversation</option>
    <option :value="undefined">New conversation</option>
    <template v-if="spaceID">
      <template
        v-for="conversation of conversationStore.conversations"
        :key="conversation.conversationID"
      >
        <option
          :value="conversation.conversationID"
          v-if="conversation.spaceID === spaceID"
        >
          {{
            Object.values(conversationStore.messages)
              .find(
                (message) =>
                  message.conversationID === conversation.conversationID,
              )
              ?.prompt.slice(0, 50)
          }}
        </option>
      </template>
    </template>
    <template v-else>
      <option
        v-for="conversation of conversationStore.conversations"
        :key="conversation.conversationID"
        :value="conversation.conversationID"
      >
        {{
          Object.values(conversationStore.messages)
            .find(
              (message) =>
                message.conversationID === conversation.conversationID,
            )
            ?.prompt.slice(0, 50)
        }}
      </option>
    </template>
  </select>
</template>

<style scoped></style>
