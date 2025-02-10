import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      component: (): unknown => {
        return import('../views/app-views-home.vue');
      },
      name: 'home',
      path: '/',
    },
    {
      component: (): unknown => {
        return import('../views/app-views-about.vue');
      },
      name: 'about',
      path: '/about',
    },
  ],
});
