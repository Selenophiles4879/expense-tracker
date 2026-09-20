import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: 'autoUpdate',

      // Custom service worker (src/sw.js) so we can add
      // Background Sync replay of the offline request queue,
      // sharing utils/offlineQueue.js with the page itself.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',

      injectManifest: {
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2}'
        ]
      },

      includeAssets: [
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png'
      ],

      manifest: {
        id: '/',
        name: 'Expense Tracker',
        short_name: 'Expense Tracker',
        description:
          'Manage your income, expenses, and financial records securely.',

        start_url: '/',
        scope: '/',
        display: 'standalone',

        background_color: '#000000',
        theme_color: '#06152f',

        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icons/icon-master-1024.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'any'
          }
        ]
      }

      // NOTE: with strategies: 'injectManifest', precaching /
      // cleanupOutdatedCaches / runtime routing are configured
      // directly in src/sw.js instead of via a `workbox` block.
    })
  ],

  build: {
    sourcemap: false,
    minify: 'esbuild',
    outDir: 'build'
  }
})
