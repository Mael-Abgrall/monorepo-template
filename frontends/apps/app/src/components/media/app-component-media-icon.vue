<script setup lang="ts">
import { Icon } from '@iconify/vue';

defineProps<{
  /** The icon to display from Iconify */
  icon: string;
}>();
</script>

<template>
  <Icon :icon="icon" class="icon" />
</template>

<style scoped>
.icon {
  flex-shrink: 0;
  @apply w-5 h-5;
}
</style>
