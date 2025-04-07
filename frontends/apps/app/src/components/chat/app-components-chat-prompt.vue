<script setup lang="ts">
import type { Message } from 'shared/schemas/shared-schemas-chat';

defineProps<{
  /** The message to display */
  message: Message;
}>();
</script>

<template>
  <div class="prompt-container">
    <div class="prompt">{{ message.prompt }}</div>
  </div>
</template>

<style scoped>
.prompt-container {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.prompt {
  max-width: 60ch;
  @apply p-2 bg-stone-200 rounded;
}
</style>
