import type { Component } from 'vue';
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router';

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
    path: 'auth/callback/:provider',
    props: (
      route: RouteLocationNormalized,
    ): {
      code: string;
      state: string;
      vendor: 'google' | 'microsoft' | undefined;
    } => {
      return {
        code: route.query.code as string,
        state: route.query.state as string,
        vendor: route.params.provider as 'google' | 'microsoft' | undefined,
      };
    },
  },
  {
    component: (): Promise<Component> => {
      return import('../views/auth/app-views-auth-otp.vue');
    },
    meta: {
      title: 'One-Time Password',
    },
    name: 'auth.otp',
    path: 'auth/one-time-password',
    props: (route: RouteLocationNormalized): { email: string } => {
      return {
        email: route.query.email as string,
      };
    },
  },
];

export { authRoutes };
