<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { documentRow } from '../../components/documents';
import upload from '../../components/ui/upload/app-components-ui-upload.vue';
import { useDocumentStore } from '../../stores/app-store-documents';

const { spaceID } = defineProps<{
  /**
   * The ID of the space to display
   */
  spaceID: string;
}>();

const documentStore = useDocumentStore();
const selectedFiles = ref<File[]>([]);

/**
 * Handle files received from the upload component
 * @param files The files to upload
 */
async function handleFiles(files: File[]): Promise<void> {
  selectedFiles.value = files;

  // push to the pending list - visual feedback to the user
  for (const file of files) {
    if (!documentStore.documentsPending.has(`${spaceID}-${file.name}`)) {
      documentStore.documentsPending.set(`${spaceID}-${file.name}`, {
        spaceID,
        status: 'pending',
        title: file.name,
      });
    }
  }

  const promises = files.map((file) => {
    return documentStore.uploadDocument({ file, spaceID });
  });
  await Promise.all(promises);
}

onMounted(async () => {
  await documentStore.listDocumentsFromSpace({ spaceID });
});
</script>

<template>
  <div v-if="documentStore.isLoading">Loading...</div>
  <template v-else>
    <upload @files="handleFiles" />

    <document-row
      v-for="[_, pendingFile] of documentStore.documentsPending"
      :key="pendingFile.title"
      :documentID="undefined"
      :status="pendingFile.status"
      :title="pendingFile.title"
    />
    <hr
      v-if="
        documentStore.documentsPending.size > 0 &&
        documentStore.documents.length > 0
      "
    />

    <div v-if="documentStore.documents.length === 0">
      No documents in this space
    </div>
    <template v-else>
      <document-row
        v-for="document of documentStore.documents"
        :key="document.documentID"
        :documentID="document.documentID"
        :status="document.status"
        :title="document.title"
      />
    </template>
  </template>
</template>

<style scoped>
hr {
  display: flex;
  width: 100%;
  height: 1px;
  @apply border-stone-300;
}

.selected-files {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
}

.file-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.status {
  font-weight: bold;
}

.pending {
  color: #718096;
}

.success {
  color: #48bb78;
}

.error {
  color: #f56565;
}

.upload-button {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background-color: #4299e1;
  color: white;
  border-radius: 0.25rem;
  border: none;
  cursor: pointer;
}

.upload-button:hover {
  background-color: #3182ce;
}
</style>
