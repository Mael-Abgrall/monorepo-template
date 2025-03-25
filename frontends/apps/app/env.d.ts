/// <reference types="vite/client" />

declare module '~icons/*' {
  import type { FunctionalComponent, SVGAttributes } from 'vue';
  export const component: FunctionalComponent<SVGAttributes>;
}
