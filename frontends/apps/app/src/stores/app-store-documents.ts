import type {
  ListDocumentsResponse,
  UploadDocumentsResponse,
} from 'shared/schemas/shared-schemas-documents';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '../helpers/app-helpers-fetch';
import { logger } from '../helpers/app-helpers-reporting';

export const useDocumentStore = defineStore('document', () => {
  const documents = ref<UploadDocumentsResponse[]>([]);
  const documentsPending = ref<
    Map<string, Omit<UploadDocumentsResponse, 'documentID' | 'userID'>>
  >(new Map());
  const spaceError = ref<string | undefined>(undefined);
  const isLoading = ref(false);

  /**
   * List all documents from a space.
   * @param root named parameters
   * @param root.forceRefresh If true, the documents list will be fetched from the server even if some documents are already in the store
   * @param root.spaceID The ID of the space
   */
  async function listDocumentsFromSpace({
    forceRefresh,
    spaceID,
  }: {
    forceRefresh?: boolean;
    spaceID: string;
  }): Promise<void> {
    if (
      !forceRefresh &&
      documents.value.some((document) => {
        return document.spaceID === spaceID;
      })
    ) {
      return;
    }

    isLoading.value = true;
    try {
      const response = await apiFetch<ListDocumentsResponse>(
        `/documents/list/${spaceID}`,
      );
      documents.value = response;
    } catch (error) {
      logger.error(error);
      spaceError.value = 'Failed to list documents';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Upload a document to a space.
   * @param root named parameters
   * @param root.file The file to upload
   * @param root.spaceID The ID of the space
   * @returns an object containing the success status and an optional error message
   */
  async function uploadDocument({
    file,
    spaceID,
  }: {
    file: File;
    spaceID: string;
  }): Promise<void> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('spaceID', spaceID);
    documentsPending.value.set(`${spaceID}-${file.name}`, {
      spaceID,
      status: 'pending',
      title: file.name,
    });

    try {
      const response = await apiFetch<UploadDocumentsResponse>(
        '/documents/upload',
        {
          body: formData,
          method: 'POST',
        },
      );
      documents.value.push(response);
      documentsPending.value.delete(`${spaceID}-${file.name}`);
    } catch (error) {
      documentsPending.value.set(`${spaceID}-${file.name}`, {
        spaceID,
        status: 'error',
        title: file.name,
      });
      logger.error(error);
      spaceError.value = 'Failed to upload documents';
    }
  }

  /**
   * Delete a document from the space
   * @param root named parameters
   * @param root.documentID The ID of the document
   */
  async function deleteDocument({
    documentID,
  }: {
    documentID: string;
  }): Promise<void> {
    try {
      await apiFetch(`/documents/delete/${documentID}`, {
        method: 'DELETE',
      });
      documents.value = documents.value.filter((document) => {
        return document.documentID !== documentID;
      });
    } catch (error) {
      logger.error(error);
      spaceError.value = 'Failed to delete document';
    }
  }

  return {
    deleteDocument,
    documents,
    documentsPending,
    isLoading,
    listDocumentsFromSpace,
    spaceError,
    uploadDocument,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useDocumentStore, import.meta.hot));
}
