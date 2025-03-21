<script setup lang="ts">
import { RouterView } from 'vue-router';
</script>

<template>
  <div class="authenticated-layout">
    <nav class="navbar">
      <div>Navbar goes here</div>
    </nav>

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.authenticated-layout {
  @apply min-h-screen;
}

.navbar {
  @apply w-full;
}
</style>
