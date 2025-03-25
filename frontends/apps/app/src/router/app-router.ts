import type { Component } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import withNav from '../layout/app-layout-with-nav.vue';
import withoutNav from '../layout/app-layout-without-nav.vue';
import { useAuthStore } from '../stores/app-stores-auth';
import { authRoutes } from './app-router-auth';

const routes = [
  {
    children: [
      {
        component: (): Promise<Component> => {
          return import('../views/app-views-home.vue');
        },
        meta: {
          title: 'Home',
        },
        name: 'home',
        path: '',
      },
    ],
    component: withNav as Component,
    meta: { requiresAuth: true },
    path: '',
  },
  {
    children: authRoutes,
    component: withoutNav as Component,
    path: '',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuth) {
    return { name: 'auth.login' };
  }
});
