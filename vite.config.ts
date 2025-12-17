import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        // Forçar porta 3001 para evitar mismatch quando 3000 estiver ocupada
        port: 3001,
        host: '0.0.0.0',
        strictPort: true,
        hmr: {
          // garante que o cliente HMR se conecta na mesma porta/host
          protocol: 'ws',
          host: 'localhost',
          port: 3001,
          clientPort: 3001,
        }
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
