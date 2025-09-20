import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'robots.txt'],
            manifest: {
                name: 'Bingo Big Screen',
                short_name: 'BingoScreen',
                description: 'Big screen display for bingo games',
                theme_color: '#000000',
                background_color: '#000000',
                display: 'fullscreen',
                orientation: 'landscape',
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                runtimeCaching: [
                    // Cache media pack JSON files
                    {
                        urlPattern: /^.*\/media-packs\/.*\.json$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'media-packs',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
                            }
                        }
                    },
                    // Cache audio files (MP3, OGG)
                    {
                        urlPattern: /^.*\.(mp3|ogg|wav)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'audio-files',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            },
                            rangeRequests: true
                        }
                    },
                    // Cache video files
                    {
                        urlPattern: /^.*\.(mp4|webm)$/,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'video-files',
                            expiration: {
                                maxEntries: 5,
                                maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            },
                            rangeRequests: true
                        }
                    },
                    // Network first for game state
                    {
                        urlPattern: /^.*\/games\/.*\/snapshot$/,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'game-state',
                            networkTimeoutSeconds: 3
                        }
                    }
                ]
            }
        })
    ],
    server: { port: 5173, host: "0.0.0.0" }
});
