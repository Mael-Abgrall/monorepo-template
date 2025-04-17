import type { Component } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { logger } from '../helpers/app-helpers-reporting';
import withNav from '../layout/app-layout-with-nav.vue';
import withoutNav from '../layout/app-layout-without-nav.vue';
import { useAuthStore } from '../stores/app-stores-auth';
import { authRoutes } from './app-router-auth';
import { spaceRoutes } from './app-router-spaces';

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
      {
        component: (): Promise<Component> => {
          return import('../views/settings/app-views-settings.vue');
        },
        meta: {
          title: 'Settings',
        },
        name: 'settings',
        path: 'settings',
      },
      {
        component: (): Promise<Component> => {
          return import('../views/app-views-support.vue');
        },
        meta: {
          title: 'Help & feedback',
        },
        name: 'support',
        path: 'support',
      },
      ...spaceRoutes,
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

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- No idea why ESLint is complaining, but authStore.isAuth.value will NOT work
  if (to.meta.requiresAuth && !authStore.isAuth) {
    logger.info('Not authenticated, redirecting to login');
    return { name: 'auth.login' };
  }
});
