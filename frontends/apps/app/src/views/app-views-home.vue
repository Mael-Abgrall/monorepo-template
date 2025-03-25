<script setup lang="ts">
import { useAuthStore } from '../stores/app-stores-auth';

const authStore = useAuthStore();
</script>

<template>
  <div class="wrapper">
    <h1 class="title">Hello</h1>

    <button @click="authStore.logout()" type="button">Logout</button>
  </div>
</template>

<style scoped>
.wrapper {
  @apply flex items-center justify-center;

  .title {
    @apply text-3xl font-bold underline;
  }
}
</style>
