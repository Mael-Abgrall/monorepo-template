<script setup lang="ts">
import componentChat from '../../components/chat/app-components-chat.vue';

defineProps<{
  /**
   * The ID of the space to display
   */
  spaceID: string;
}>();
</script>

<template>
  <div>
    <h1>Dashboard</h1>
    <componentChat :spaceID="spaceID" />
    <ul>
      <li>needs to:</li>
      <li>Create a new chat</li>
      <li>Upload files</li>

      <li>Display the associated chats, files and generated files</li>
      <!-- <li>Select/show "connected tools"</li> -->
      <li>Display the workspace instructions</li>
      <li>Display the visibility and shared with</li>
    </ul>
  </div>
</template>

<style scoped></style>
