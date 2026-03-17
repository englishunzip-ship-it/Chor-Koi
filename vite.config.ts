import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.jpg'],
        workbox: {
          navigateFallbackDenylist: [/^\/~oauth/],
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
        },
        manifest: {
          name: 'Chor Koi - দুর্নীতি রিপোর্ট',
          short_name: 'Chor Koi',
          description: 'A crowd-powered corruption reporting platform for public accountability.',
          theme_color: '#dc2626',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          icons: [
            { src: '/logo.jpg', sizes: '192x192', type: 'image/jpeg' },
            { src: '/logo.jpg', sizes: '512x512', type: 'image/jpeg' },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
