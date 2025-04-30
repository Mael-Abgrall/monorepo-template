<script setup lang="ts">
import { ref } from 'vue';
import { iconOpenDown } from '../icons';

defineProps<{
  /** The message to display */
  content: unknown;
}>();

const isOpen = ref(false);
</script>

<template>
  <div class="dropdown-title" @click="isOpen = !isOpen">
    <template v-if="content.toolUse"> Tool request </template>
    <template v-else-if="content.toolResult"> Tool result </template>
    <template v-else> Debug info </template>
    <iconOpenDown />
  </div>
  <div class="response" :class="{ isOpen }">
    <pre
      class="response-content prose prose-stone"
      v-html="JSON.stringify(content, null, 2)"
    ></pre>
  </div>
</template>

<style scoped>
.dropdown-title {
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  width: 60ch;
  @apply p-2 bg-stone-200 rounded mx-auto;
}

.response {
  display: none;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.isOpen {
  display: flex;
}

.response-content {
  width: 100%;
  font-style: italic;
  overflow-y: auto;
  @apply text-sm bg-stone-800 text-stone-300 rounded p-2;
}
</style>
