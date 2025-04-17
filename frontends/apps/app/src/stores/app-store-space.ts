import type {
  ListSpacesResponse,
  PostSpaceBody,
  Space,
} from 'shared/schemas/shared-schemas-space';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { apiFetch } from '../helpers/app-helpers-fetch';
import { logger } from '../helpers/app-helpers-reporting';

export const useSpaceStore = defineStore('space', () => {
  const spaces = ref<Space[]>([]);
  const spaceError = ref<string | undefined>(undefined);
  const isLoading = ref(false);

  /**
   * List all spaces from the server.
   * @param forceRefresh If true, the spaces will be fetched from the server even if they are already in the store
   */
  async function listSpaces(forceRefresh = false): Promise<void> {
    if (!forceRefresh && spaces.value.length > 0) {
      return;
    }

    isLoading.value = true;
    try {
      const response = await apiFetch<ListSpacesResponse>('/space/list');
      spaces.value = response;
    } catch (error) {
      logger.error(error);
      spaceError.value = 'Failed to list spaces';
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Create a new space.
   * @param root named parameters
   * @param root.title the title of the space
   * @returns the ID of the created space
   */
  async function createSpace({
    title,
  }: {
    title: string | undefined;
  }): Promise<string> {
    isLoading.value = true;
    try {
      const response = await apiFetch<Space>('/space', {
        body: {
          title,
        } satisfies PostSpaceBody,
        method: 'POST',
      });
      spaces.value.push(response);
      isLoading.value = false;
      return response.spaceID;
    } catch (error) {
      logger.error(error);
      spaceError.value = 'Failed to create space';
      isLoading.value = false;
      throw error;
    }
  }

  return {
    createSpace,
    isLoading,
    listSpaces,
    spaceError,
    spaces,
  };
});
