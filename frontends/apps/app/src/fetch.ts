import { ofetch } from 'ofetch';

export const apiFetch = ofetch.create({
  baseURL:
    import.meta.env.MODE === 'development'
      ? 'http://localhost:8787'
      : 'https://api.example.com',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});
