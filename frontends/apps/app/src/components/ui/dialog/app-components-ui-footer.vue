<script setup lang="ts"></script>

<template>
  <div class="dialog-footer">
    <slot />
  </div>
</template>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: space-between;
}
</style>
