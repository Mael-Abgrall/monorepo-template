<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, useRoute } from 'vue-router';

const { toName: name } = defineProps<{
  /** The route name to navigate to when the button is clicked */
  toName: string;
}>();

const route = useRoute();
const active = computed(() => {
  return route.name === name;
});
</script>

<template>
  <router-link :to="{ name }" class="sidebar-button" :class="{ active }">
    <slot name="icon" class="sidebar-button-icon" />
    <slot />
  </router-link>
</template>

<style scoped>
.sidebar-button {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: 600;
  width: 25ch;
  @apply rounded py-1 px-2 text-stone-600 gap-2;

  &:hover {
    cursor: pointer;
    @apply bg-stone-300 text-stone-700;
  }

  &.active {
    @apply bg-brand-100 text-brand-700;
  }

  .sidebar-button-icon {
    @apply h-8 w-8;
  }
}
</style>
