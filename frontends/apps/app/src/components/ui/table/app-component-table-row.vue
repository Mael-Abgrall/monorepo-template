<template>
  <tr class="row">
    <slot />
  </tr>
</template>

<script setup lang="ts"></script>

<style scoped>
.row {
  border-bottom: 1px solid;
  @apply border-stone-300;
}

/* Apply hover only if the row does NOT contain a th */
.row:not(:has(th)):hover {
  @apply bg-stone-100/50;
}
</style>
