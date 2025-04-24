<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useChatsStore } from '../../stores/app-store-chats';
import { useSpacesStore } from '../../stores/app-store-space';

const { spaceID } = defineProps<{
  /**
   * The ID of the space to display
   */
  spaceID: string;
}>();

const route = useRoute();
const chatsStore = useChatsStore();
const spacesStore = useSpacesStore();

onMounted(async () => {
  await chatsStore.listChatsInSpace({ spaceID });
});
</script>

<template>
  <div>
    <h1>
      {{
        spacesStore.spaces.find((space) => space.spaceID === spaceID)?.title ||
        'No title'
      }}
    </h1>
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
