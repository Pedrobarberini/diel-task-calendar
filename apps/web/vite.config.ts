import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  return {
    base: env.VITE_BASE_PATH || '/',
    plugins: [react()],
    define: {
      'import.meta.env.VITE_DATA_MODE': JSON.stringify(
        mode === 'rest' ? 'rest' : env.VITE_DATA_MODE || 'firebase',
      ),
    },
    server: { host: '127.0.0.1', port: 5173, proxy: { '/api': 'http://127.0.0.1:3001' } },
  };
});
