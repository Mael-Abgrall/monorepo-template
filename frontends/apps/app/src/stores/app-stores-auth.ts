import type { GenericResponse } from 'shared/schemas/shared-schemas';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { logger } from 'web-utils/reporting';
import { apiFetch } from '../fetch';
import { useUserStore } from './app-stores-user';

const initialIsAuth = JSON.parse(
  localStorage.getItem('isAuth') ?? 'false',
) as boolean;

/**
 * Indicate the status of the user's session, and sync it with local storage
 */
export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();
  const userStore = useUserStore();

  const loading = ref(false);
  const authError = ref<string | undefined>();
  const isAuth = ref<boolean>(initialIsAuth);

  watch(isAuth, (updatedValue) => {
    localStorage.setItem('isAuth', JSON.stringify(updatedValue));
  });

  /**
   * Request a logout from the server, and redirect to the login page
   */
  async function logout(): Promise<void> {
    try {
      await apiFetch<GenericResponse>('/auth/logout', {
        method: 'POST',
      });
      isAuth.value = false;
      await userStore.removeUser();
      await router.push({ name: 'auth.login' });
    } catch (error) {
      logger.error(error);
      authError.value = 'Logging out failed';
    }
  }

  /**
   * Indicate the user is logged in with the server.
   * This is used by the router to redirect the user to the home page
   */
  async function saveLogin(): Promise<void> {
    isAuth.value = true;
    await userStore.fetchUser();
  }

  /**
   * Request a new cookie/token from the server
   * @returns true if the user is logged in, false if the user is kicked out
   */
  async function refreshToken(): Promise<boolean> {
    // todo: prevent race condition (especially with the SSE)
    try {
      await apiFetch<GenericResponse>('/auth/refresh', {
        method: 'POST',
      });
      return true;
    } catch (error) {
      logger.error(error);
      isAuth.value = false;
      await userStore.removeUser();
      authError.value = 'Failed you have been logged out';
      await router.push({ name: 'auth.login' });
      return false;
    }
  }

  return {
    authError,
    isAuth,
    loading,
    logout,
    refreshToken,
    saveLogin,
  };
});
