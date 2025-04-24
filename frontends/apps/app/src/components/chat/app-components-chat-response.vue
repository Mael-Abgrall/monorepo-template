<script setup lang="ts">
import MarkdownIt from 'markdown-it';
defineProps<{
  /** The message to display */
  text: string;
}>();

const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});
</script>

<template>
  <div class="response">
    <div
      class="response-content prose prose-stone"
      v-html="markdown.render(text)"
    ></div>
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

  /* display: flex;
  flex-direction: column;
  align-items: flex-start;
  @apply gap-2; */
}
</style>
