import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [],
      manifest: {
        name: '教师工作台',
        short_name: '工作台',
        description: '教培管理一站式工具：排课、考勤、课时统计、课程记录、资源库',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'portrait',
        theme_color: '#4f46e5',
        background_color: '#f1f5f9',
        icons: [
          {
            src: 'icon.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && ['image', 'font'].includes(request.destination),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-static-cache',
              expiration: {
                maxEntries: 120,
                maxAgeSeconds: 60 * 60 * 24 * 14,
              },
            },
          },
        ],
      },
    }),
  ],
});
