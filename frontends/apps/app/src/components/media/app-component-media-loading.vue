<script setup lang="ts">
import { iconSpinner } from '../icons';

defineProps<{
  /** The size of the loading spinner */
  size?: 'large' | 'medium' | 'small';
}>();
</script>

<template>
  <div class="loading-container">
    <iconSpinner class="loading-spinner" :class="size" />
  </div>
</template>

<style scoped>
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-spinner {
  @apply w-5 h-5;
  animation: spin 1s linear infinite;
}

.loading-spinner.large {
  @apply w-24 h-24;
}

.loading-spinner.medium {
  @apply w-16 h-16;
}

.loading-spinner.small {
  @apply w-12 h-12;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
