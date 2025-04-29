import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vueDevTools from 'vite-plugin-vue-devtools';
import Icons from 'unplugin-icons/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    Icons({
      compiler: 'vue3',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    sourcemap: 'hidden',
  },
});
