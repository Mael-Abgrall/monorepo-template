<script setup lang="ts"></script>

<template>
  <div class="dialog-header">
    <slot />
  </div>
</template>

<style scoped>
.dialog-header {
  display: flex;
  flex-direction: column;
  @apply gap-1;
}
</style>
