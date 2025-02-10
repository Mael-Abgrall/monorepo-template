import './assets/main.css';

import { createPinia } from 'pinia';
import { createApp } from 'vue';

import App from './app.vue';
import { router } from './router/index.js';

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument -- it's okay
const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
