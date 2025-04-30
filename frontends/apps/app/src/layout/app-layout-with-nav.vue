<script setup lang="ts">
import { RouterView } from 'vue-router';
import { navigationSidebarNavbar } from '../components/navigation/sidebar/app-navigation-sidebar';
</script>

<template>
  <div class="authenticated-layout">
    <navigationSidebarNavbar />

    <main>
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.authenticated-layout {
  height: 100%;
  display: flex;
}

main {
  flex: 1;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  @apply container mx-auto py-5 gap-2 px-2;
}
</style>
