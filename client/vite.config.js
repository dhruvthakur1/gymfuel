import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the API runs separately; in production VITE_API_URL points at it.
    proxy: { '/api': 'http://localhost:4000' },
  },
});
