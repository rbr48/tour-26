import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Stamps a unique id into the service worker's cache name on every build, so an updated
// deploy replaces the cached app shell instead of serving the previous version forever.
function serviceWorkerBuildId() {
  return {
    name: 'service-worker-build-id',
    apply: 'build',
    closeBundle() {
      const swPath = path.resolve(process.cwd(), 'dist', 'sw.js');
      const source = readFileSync(swPath, 'utf8');
      writeFileSync(swPath, source.replace('__BUILD_ID__', Date.now().toString(36)));
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    serviceWorkerBuildId(),
  ],
  build: {
    // Firebase and React change rarely, so they live in their own cacheable chunks.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'firebase', test: /node_modules[\\/](firebase|@firebase)[\\/]/, priority: 20 },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 20 },
          ],
        },
      },
    },
    // Firebase (Auth and Firestore) is needed at startup, so it stays one chunk. Its gzipped
    // size, not the raw size this limit checks, decides load time.
    chunkSizeWarningLimit: 700,
  },
  server: {
    // Local development: the backup API runs on the Node server.
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    },
  },
});
