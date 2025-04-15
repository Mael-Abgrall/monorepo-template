<script setup lang="ts"></script>

<template>
  <div class="dialog-description">
    <slot />
  </div>
</template>

<style scoped>
.dialog-description {
  @apply text-sm text-stone-500;
}
</style>
