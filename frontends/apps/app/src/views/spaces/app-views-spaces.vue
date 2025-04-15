<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import componentButton from '../../components/containment/app-component-containment-button.vue';
import { iconFolder, iconPlus } from '../../components/icons';
import {
  dialogFooter,
  dialogHeader,
  dialogTitle,
  uiDialog,
} from '../../components/ui/dialog';
import { useSpaceStore } from '../../stores/app-store-space';

const router = useRouter();
const spaceStore = useSpaceStore();

const visible = ref(false);
const title = ref('');

onMounted(async () => {
  await spaceStore.listSpaces();
});

/**
 * Create a new space.
 */
async function createSpace(): Promise<void> {
  const spaceID = await spaceStore.createSpace({
    title: title.value.length > 0 ? title.value.trim() : undefined,
  });
  visible.value = false;
  title.value = '';
  await router.push({ name: 'space.dashboard', params: { spaceID } });
}
</script>

<template>
  <div class="banner">
    <div class="page-info">
      <h1>
        <iconFolder />
        Spaces
      </h1>
      <div class="page-info-description">
        <p>Spaces help you organize conversations, files and sources.</p>
        <p>You can also share them with your team or the public.</p>
      </div>
    </div>
    <button type="button" @click="visible = true">
      <componentButton>
        <iconPlus />
        Create
      </componentButton>
    </button>
  </div>
  <ul>
    <componentButton
      variant="link"
      v-for="space of spaceStore.spaces"
      :key="space.spaceID"
    >
      <RouterLink
        :to="{ name: 'space.dashboard', params: { spaceID: space.spaceID } }"
      >
        {{ space.title }}
      </RouterLink>
    </componentButton>
  </ul>
  <uiDialog v-model="visible">
    <dialogHeader>
      <dialogTitle>Create a new space</dialogTitle>
    </dialogHeader>
    <input
      type="text"
      placeholder="Title (optional - leave empty to create automatically)"
      v-model="title"
    />
    <dialogFooter>
      <div></div>
      <componentButton variant="secondary" @click="createSpace">
        Next
      </componentButton>
    </dialogFooter>
  </uiDialog>
</template>

<style scoped>
.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-info {
  display: flex;
  flex-direction: column;
  @apply gap-2;

  h1 {
    display: flex;
    align-items: center;
    @apply gap-2;
  }

  p {
    font-style: italic;
    @apply text-sm text-stone-500;
  }
}
</style>
