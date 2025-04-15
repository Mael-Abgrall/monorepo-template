import type { Component } from 'vue';
import type { RouteRecordRaw } from 'vue-router';

const spaceRoutes: RouteRecordRaw[] = [
  {
    component: (): Promise<Component> => {
      return import('../views/spaces/app-views-spaces.vue');
    },
    meta: {
      title: 'Spaces',
    },
    name: 'spaces',
    path: 'spaces',
  },
  {
    children: [
      {
        component: (): Promise<Component> => {
          return import('../views/spaces/app-views-space-dashboard.vue');
        },
        name: 'space.dashboard',
        path: '',
        props: true,
      },
      {
        component: (): Promise<Component> => {
          return import('../views/spaces/app-views-space-files.vue');
        },
        name: 'space.files',
        path: 'files',
        props: true,
      },
    ],
    component: (): Promise<Component> => {
      return import('../views/spaces/app-views-space.vue');
    },
    name: 'space',
    path: 'spaces/:spaceID',
    props: true,
  },
];

export { spaceRoutes };
