<script setup lang="ts">
import { formatDateToDDMonYY } from 'shared/time';
import { onMounted, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
import componentButton from '../../components/containment/app-component-containment-button.vue';
import {
  iconEnter,
  iconFolder,
  iconPlus,
  iconSpinner,
} from '../../components/icons';
import {
  dialogFooter,
  dialogHeader,
  dialogTitle,
  uiDialog,
} from '../../components/ui/dialog';
import { useSpacesStore } from '../../stores/app-store-space';

const router = useRouter();
const spacesStore = useSpacesStore();

const visible = ref(false);
const title = ref('');

onMounted(async () => {
  await spacesStore.listSpaces();
});

/**
 * Create a new space.
 */
async function createSpace(): Promise<void> {
  const spaceID = await spacesStore.createSpace({
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
        <p>Spaces help you organize chats, files and sources.</p>
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
  <div class="spaces-list" v-if="!spacesStore.isLoading">
    <div class="spaces-header">
      <div class="spaces-header-created">created</div>
      <div class="spaces-header-title">Title</div>
    </div>
    <RouterLink
      :to="{ name: 'space.dashboard', params: { spaceID: space.spaceID } }"
      class="space"
      v-for="space of spacesStore.spaces.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )"
      :key="space.spaceID"
    >
      <div class="space-created">
        {{ formatDateToDDMonYY({ date: space.createdAt }) }}
      </div>
      <div class="space-title">
        {{ space.title }}
      </div>
    </RouterLink>
  </div>
  <div v-if="spacesStore.isLoading">Loading spaces... <iconSpinner /></div>
  <uiDialog v-model="visible">
    <dialogHeader>
      <dialogTitle>Create a new space</dialogTitle>
    </dialogHeader>
    <input
      type="text"
      placeholder="Title (optional - leave empty to create automatically)"
      v-model="title"
      @keyup.enter="createSpace"
    />
    <dialogFooter>
      <div></div>
      <componentButton variant="primary" @click="createSpace">
        Create <iconEnter />
      </componentButton>
    </dialogFooter>
  </uiDialog>
</template>

<style scoped>
.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
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

.spaces-list {
  display: flex;
  flex-direction: column;
  width: 100%;

  .spaces-header,
  .space {
    display: flex;
    align-items: center;
    border-bottom: 1px solid;
    @apply p-2 border-stone-300 gap-2;
  }

  .spaces-header {
    font-weight: 600;

    .spaces-header-created {
      width: 9ch;
    }
  }

  .space {
    &:hover {
      @apply bg-stone-100/50;
    }

    .space-title {
      flex: 1;
    }

    .space-created {
      width: 9ch;
      font-style: italic;
      @apply text-stone-500;
    }
  }
}
</style>
