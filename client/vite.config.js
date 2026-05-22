import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,  // LAN内の他デバイスからもアクセス可能
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
