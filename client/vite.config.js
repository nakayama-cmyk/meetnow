import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages では /meetnow/ をベースにする
  base: process.env.GITHUB_ACTIONS ? '/meetnow/' : '/',
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
