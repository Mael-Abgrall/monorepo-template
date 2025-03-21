<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="layout-without-nav">
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout-without-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  @apply min-h-screen;

  main {
    width: 100%;
    height: 100%;
  }
}
</style>
