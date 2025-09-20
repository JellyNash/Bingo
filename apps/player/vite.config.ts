import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3000';

// Escape string for regex
const escapeRegex = (str: string) => str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false, // Use external manifest.json
      includeAssets: ['favicon.ico', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      devOptions: {
        enabled: true
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Cache game snapshots with NetworkFirst
            urlPattern: new RegExp(`^${escapeRegex(API_BASE)}/games/[^/]+/snapshot$`),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'game-snapshots',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 300 // 5 minutes
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Never cache mutations (join, resume, mark, claim)
            urlPattern: new RegExp(`^${escapeRegex(API_BASE)}/(join|resume|cards/.+/(mark|claim))$`),
            handler: 'NetworkOnly'
          },
          {
            // Don't cache health checks
            urlPattern: new RegExp(`^${escapeRegex(API_BASE)}/health$`),
            handler: 'NetworkOnly'
          },
          {
            // Cache fonts
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5175
  }
});