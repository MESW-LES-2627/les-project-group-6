import './assets/styles/main.css';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { setUnauthorizedHandler } from './services/api';
import { session } from './stores/session';

const app = createApp(App);

app.use(router);

// An API 401 means the session is gone: drop it and show the login page.
setUnauthorizedHandler(() => {
  if (session.state.status !== 'ready') return;
  session.expire();
  void router.push({ name: 'login' });
});

app.mount('#app');
