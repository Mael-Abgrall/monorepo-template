<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterView } from 'vue-router';
import componentMediaLoading from './components/media/app-component-media-loading.vue';
import { useUserStore } from './stores/app-stores-user';

const userStore = useUserStore();

onMounted(async () => {
  await userStore.fetchUser();
});
</script>

<template>
  <component-media-loading v-if="userStore.userLoading" />
  <RouterView />
</template>

<style scoped></style>
