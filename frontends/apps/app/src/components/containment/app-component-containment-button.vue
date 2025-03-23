<template>
  <div class="button" :class="type ? type : ''">
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** The visual style variant of the button */
  type?: 'discreet' | 'primary' | 'secondary';
}>();
</script>

<style scoped>
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  @apply bg-white text-black py-2 px-4 rounded-md;

  &.primary {
    font-weight: 600;
    @apply bg-brand-500 text-white;

    &:hover {
      @apply bg-brand-600;
    }
  }

  &.secondary {
    @apply bg-white text-brand-500;

    &:hover {
      @apply bg-brand-50;
    }
  }

  &.discreet {
    @apply bg-transparent text-gray-700;

    &:hover {
      @apply text-gray-900;
    }
  }
}
</style>
