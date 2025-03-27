<script setup lang="ts">
defineProps<{
  /** The title of the group */
  title?: string;
}>();
</script>

<template>
  <div class="sidebar-group">
    <div class="sidebar-group-title" v-if="title">{{ title }}</div>
    <slot />
  </div>
</template>

<style scoped>
.sidebar-group {
  display: flex;
  flex-direction: column;
  @apply p-2 gap-1;

  .sidebar-group-title {
    @apply text-sm text-stone-700;
  }
}
</style>
