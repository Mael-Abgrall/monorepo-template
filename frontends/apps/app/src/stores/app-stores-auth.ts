import { defineStore } from 'pinia';
import { ref } from 'vue';

/**
 * Indicate the status of the user's session, and sync it with local storage
 */
export const useAuthStore = defineStore('auth', () => {
  const loading = ref(false);
  const error = ref<string | undefined>();
  const isAuth = ref<boolean | undefined>();

  /**
   * Request a logout from the server and delete local data
   */
  async function logout() {}

  /**
   * Indicate the user is logged in with the server, and sync the status with local storage
   */
  async function login() {}

  /**
   * Request a new cookie/token from the server
   */
  async function refreshToken() {}
});
