<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router';

defineProps<{
  /**
   * The ID of the space to display
   */
  spaceID: string;
}>();

const route = useRoute();
</script>

<template>
  <div>
    <h1>Space {{ spaceID }}</h1>
    <RouterLink
      class="space-link"
      :to="{ name: 'space.dashboard', params: { spaceID } }"
      :class="{ active: route.name === 'space.dashboard' }"
    >
      Dashboard
    </RouterLink>
    <RouterLink
      class="space-link"
      :to="{ name: 'space.files', params: { spaceID } }"
      :class="{ active: route.name === 'space.files' }"
    >
      Files
    </RouterLink>
    <RouterView></RouterView>
  </div>
</template>

<style scoped>
.space-link {
  @apply text-stone-500;
}

.space-link.active {
  @apply text-brand-500;
}
</style>
