import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'firebase-auth': ['firebase/app', 'firebase/auth'],
            'firebase-store': ['firebase/firestore'],
          },
        },
      },
    },
    server: { port: 5173, proxy: { '/api': 'http://127.0.0.1:3001' } },
  };
});
