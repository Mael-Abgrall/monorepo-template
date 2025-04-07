<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import componentMediaLoading from './components/media/app-component-media-loading.vue';
import { useConversationStore } from './stores/app-store-conversation';
import { useUserStore } from './stores/app-stores-user';

const userStore = useUserStore();
const conversationStore = useConversationStore();

onMounted(async () => {
  await userStore.fetchUser();
  await conversationStore.listConversations();
});
</script>

<template>
  <component-media-loading v-if="userStore.userLoading" />
  <RouterView />
</template>

<style scoped></style>
