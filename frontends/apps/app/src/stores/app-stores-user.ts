import type { GetMeResponse } from 'shared/schemas/shared-user-schemas';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { usePostHog } from '../composables/app-composables-analytics';
import { apiFetch } from '../helpers/app-helpers-fetch';
import { logger } from '../helpers/app-helpers-reporting';

const { posthog } = usePostHog();

const userFromLocalStorage = localStorage.getItem('user');
const userFromLocalStorageParsed = userFromLocalStorage
  ? (JSON.parse(userFromLocalStorage) as GetMeResponse | undefined)
  : undefined;

if (userFromLocalStorageParsed) {
  posthog.identify(userFromLocalStorageParsed.id);
}

export const useUserStore = defineStore('user', () => {
  const user = ref<GetMeResponse | undefined>(userFromLocalStorageParsed);
  const userLoading = ref(false);
  const userError = ref<string | undefined>();

  watch(user, (updatedValue) => {
    if (updatedValue) {
      localStorage.setItem('user', JSON.stringify(updatedValue));
      posthog.identify(updatedValue.id);
    } else {
      localStorage.removeItem('user');
      posthog.reset();
    }
  });

  /**
   * Get the current user from the server
   * @param forceRefresh - If true, the user will be fetched from the server even if it is already in the store
   */
  async function fetchUser(forceRefresh = false): Promise<void> {
    if (!forceRefresh && user.value) {
      return;
    }

    try {
      userLoading.value = true;
      const userResponse = await apiFetch<GetMeResponse>('/user/me');
      user.value = userResponse;
    } catch (error) {
      logger.error(error);
      user.value = undefined;
      userError.value = 'Failed to fetch your profile';
    } finally {
      userLoading.value = false;
    }
  }

  /**
   * Remove the user from the store
   */
  async function removeUser(): Promise<void> {
    user.value = undefined;
  }

  return {
    fetchUser,
    removeUser,
    user,
    userError,
    userLoading,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useUserStore, import.meta.hot));
}
