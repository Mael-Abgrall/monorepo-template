import type { GenericResponse } from 'shared/schemas/shared-schemas';
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiFetch } from '../fetch';

const initialIsAuth = JSON.parse(
  localStorage.getItem('isAuth') ?? 'false',
) as boolean;

/**
 * Indicate the status of the user's session, and sync it with local storage
 */
export const useAuthStore = defineStore('auth', () => {
  const router = useRouter();

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
      await router.push({ name: 'auth.login' });
    } catch (error) {
      console.error(error);
      authError.value = 'Logging out failed';
    }
  }

  /**
   * Indicate the user is logged in with the server.
   * This is used by the router to redirect the user to the home page
   */
  async function saveLogin(): Promise<void> {
    isAuth.value = true;
  }

  /**
   * Request a new cookie/token from the server
   */
  async function refreshToken(): Promise<void> {
    try {
      await apiFetch<GenericResponse>('/api/auth/refresh', {
        method: 'POST',
      });
    } catch (error) {
      console.error(error);
      isAuth.value = false;
      authError.value = 'Failed you have been logged out';
      await router.push({ name: 'auth.login' });
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
