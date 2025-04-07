<script setup lang="ts">
import type { Message } from 'shared/schemas/shared-schemas-chat';

defineProps<{
  /** The message to display */
  message: Message;
}>();
</script>

<template>
  <div class="response">
    <div class="response-content">
      {{ message.response }}
    </div>
  </div>
</template>

<style scoped>
.response {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.response-content {
  max-width: 60ch;
}
</style>
