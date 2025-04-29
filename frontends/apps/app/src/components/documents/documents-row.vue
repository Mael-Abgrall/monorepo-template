<script lang="ts" setup>
import { useDocumentStore } from '../../stores/app-store-documents';
import componentButton from '../containment/app-component-containment-button.vue';
import { iconSpinner, iconWarning, iconXMark } from '../icons';
import documentsIcon from './documents-icon.vue';

defineProps<{
  /**
   * The ID of the document
   */
  documentID: string | undefined;
  /**
   * The status of the document
   */
  status: string;
  /**
   * The title of the document
   */
  title: string;
}>();

const documentStore = useDocumentStore();
</script>

<template>
  <div class="file-row">
    <documents-icon :title="title" />
    <div class="title">
      {{ title }}
    </div>
    <div class="status" v-if="status === 'pending'">Pending upload</div>
    <div class="status" v-if="status === 'uploading'">Uploading</div>
    <div class="status" v-if="status === 'error'">Error</div>
    <div class="status" v-if="status === 'pendingIndexing'">
      AI has not indexed this document yet
    </div>
    <div class="status" v-else-if="status === 'indexed'">Ready to use</div>
    <div class="status" v-else>{{ status }}</div>
    <iconSpinner
      v-if="status === 'pending' || status === 'uploading'"
      class="status-icon"
    />
    <iconWarning v-else-if="status === 'error'" class="status-icon" />
    <componentButton
      v-else-if="documentID"
      variant="ghost"
      size="icon"
      @click="documentStore.deleteDocument({ documentID })"
    >
      <iconXMark class="status-icon" />
    </componentButton>
  </div>
</template>

<style scoped>
.file-row {
  display: flex;
  align-items: center;
  width: 100%;
  @apply gap-2 p-2;

  .title {
    flex: 1;
  }

  .status {
    flex: 1;
    text-align: right;
  }
}
</style>
