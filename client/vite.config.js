import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 5180,
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY || 'http://localhost:5050',
          changeOrigin: true,
        },
      },
    },
  };
});
