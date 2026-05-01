import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  // Bind the dev server to all network interfaces so a phone on the same WiFi
  // can hit it via the printed LAN URL ("Network: http://192.168.x.x:5173").
  // Enables fast iteration without a Vercel deploy round-trip.
  server: {
    host: true,
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          supabase: ['@supabase/supabase-js'],
          'qr-pdf': ['pdf-lib', 'qrcode'],
        },
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg'],
      manifest: {
        name: 'BeyArena',
        short_name: 'BeyArena',
        lang: 'de',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        // SVG icons are supported by all modern browsers including iOS 16.4+.
        // Some Android browsers / older iOS versions still prefer PNG — Phase 2
        // follow-up: render PNG fallbacks (192/512/maskable-512) from this SVG
        // via sharp before launch.
        icons: [
          {
            src: '/icons/icon.svg',
            type: 'image/svg+xml',
            sizes: 'any',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Activate new SW immediately so deploys land without users having to
        // close all tabs. clientsClaim takes over open tabs after activation.
        // cleanupOutdatedCaches evicts stale precache entries from previous
        // builds so we don't leak storage forever.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,png,svg,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-api', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
});
