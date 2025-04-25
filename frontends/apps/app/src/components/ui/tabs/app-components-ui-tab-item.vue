<script setup lang="ts">
defineProps<{
  /**
   * Whether the tab is active
   */
  active?: boolean;
}>();
</script>

<template>
  <div class="tab-item-wrapper" :class="{ active }">
    <div class="tab-item" :class="{ active }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.tab-item-wrapper {
  display: flex;
  @apply px-2 rounded;

  &.active {
    @apply text-brand-500;
  }

  &:hover {
    @apply bg-stone-100;
  }
}

.tab-item-wrapper:last-child {
  @apply rounded-r;
}

.tab-item {
  display: flex;
  align-items: center;
  font-weight: 600;
  @apply py-2 text-stone-600 gap-2;

  &:hover {
    @apply text-stone-950;
  }

  &.active {
    border-bottom: 2px solid;
    @apply text-brand-500 border-brand-500;
  }
}
</style>
