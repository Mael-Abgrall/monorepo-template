import { ofetch } from 'ofetch';
import { useAuthStore } from '../stores/app-stores-auth';

let isRefreshing = false;

export const apiFetch = ofetch.create({
  baseURL:
    import.meta.env.MODE === 'development'
      ? 'http://localhost:8787'
      : 'https://api.example.com', // todo: change to the actual API URL
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
  onResponseError: async (error) => {
    const authStore = useAuthStore();

    if (
      error.response.status === 401 &&
      authStore.isAuth &&
      !error.response.url.includes('/api/auth') &&
      !isRefreshing
    ) {
      isRefreshing = true;
      await authStore.refreshToken();
      isRefreshing = false;
    }
    // todo: retry the request upon success
  },
  retry: 3,
  retryDelay: 1000,
});
