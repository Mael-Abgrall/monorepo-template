<script setup lang="ts">
import buttonComponent from '../../components/containment/app-component-containment-button.vue';
import { useAuthStore } from '../../stores/app-stores-auth';

const authStore = useAuthStore();
</script>

<template>
  <h1>Settings</h1>
  <button @click="authStore.logout()" type="button">
    <buttonComponent variant="destructive"> Logout</buttonComponent>
  </button>
</template>

<style scoped>
.wrapper {
  @apply flex items-center justify-center;

  .title {
    @apply text-3xl font-bold underline;
  }
}
</style>
