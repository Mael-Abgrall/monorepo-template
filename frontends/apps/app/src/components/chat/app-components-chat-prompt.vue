<script setup lang="ts">
defineProps<{
  /** The text to display from the content block */
  text: string;
}>();
</script>

<template>
  <div class="prompt-container">
    <div class="prompt">{{ text }}</div>
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
