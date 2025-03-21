import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

const authRoutes: RouteRecordRaw[] = [
  {
    component: (): Promise<Component> => {
      return import('../views/auth/app-views-auth-login.vue');
    },
    meta: {
      title: 'Login',
    },
    name: 'auth.login',
    path: 'login',
  },
  {
    component: (): Promise<Component> => {
      return import('../views/auth/app-views-auth-callback.vue');
    },
    meta: {
      title: 'Callback',
    },
    name: 'auth.callback',
    path: 'callback',
  },
  {
    component: (): Promise<Component> => {
      return import('../views/auth/app-views-auth-otp.vue');
    },
    meta: {
      title: 'One-Time Password',
    },
    name: 'auth.otp',
    path: 'one-time-password',
  },
];

export { authRoutes };
