<script setup lang="ts">
defineProps<{
  /**
   * The ID of the space to display
   */
  spaceID: string;
}>();
</script>

<template>
  <div>
    <h1>Dashboard for space {{ spaceID }}</h1>
    <ul>
      <li>needs to:</li>
      <li>Create a new conversation</li>
      <li>Upload files</li>

      <li>Display the associated conversations, files and generated files</li>
      <li>Select/show "connected tools"</li>
      <li>Display the workspace instructions</li>
      <li>Display the visibility and shared with</li>
    </ul>
  </div>
</template>

<style scoped></style>
