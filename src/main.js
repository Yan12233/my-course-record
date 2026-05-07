import { createApp } from 'vue';
import { registerSW } from 'virtual:pwa-register';
import App from './App.vue';
import './style.css';

registerSW({ immediate: true });

window.addEventListener('vite:preloadError', () => {
  // 新版本发布后，旧入口引用到失效 chunk 时，自动刷新以加载最新资源。
  window.location.reload();
});

createApp(App).mount('#app');
