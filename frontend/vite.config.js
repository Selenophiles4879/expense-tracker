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

      includeAssets: [
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png'
      ],

      manifest: {
        id: '/',
        name: 'Expense Tracker',
        short_name: 'ExpTracker',
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
      },

      workbox: {
        cleanupOutdatedCaches: true,

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2}'
        ]
      }
    })
  ],

  build: {
    outDir: 'build'
  }
})
