<script setup lang="ts">
import { onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import componentButton from '../../components/containment/app-component-containment-button.vue';
import { iconAI, iconBack, iconFolder } from '../../components/icons';
import { tabItem, tabs } from '../../components/ui/tabs';
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
  <div class="header">
    <RouterLink :to="{ name: 'spaces' }" class="header-back-button">
      <componentButton variant="ghost"> <iconBack /> Spaces </componentButton>
    </RouterLink>
    <h1>
      {{
        spacesStore.spaces.find((space) => space.spaceID === spaceID)?.title ||
        'No title'
      }}
    </h1>
  </div>
  <tabs>
    <RouterLink :to="{ name: 'space.dashboard', params: { spaceID } }">
      <tabItem :active="route.name === 'space.dashboard'">
        <iconAI /> Dashboard
      </tabItem>
    </RouterLink>

    <RouterLink :to="{ name: 'space.files', params: { spaceID } }">
      <tabItem :active="route.name === 'space.files'">
        <iconFolder />
        Files
      </tabItem>
    </RouterLink>

    <!-- <tabItem :active="route.name === 'space.settings'">
        <iconSettings /> Settings
      </tabItem> -->
  </tabs>

  <RouterView></RouterView>
</template>

<style scoped>
.header {
  width: 100%;
  display: flex;
  align-items: center;

  h1 {
    flex: 1;
    @apply text-xl py-2 px-4;
  }

  .header-back-button {
    position: absolute;
  }
}
</style>
