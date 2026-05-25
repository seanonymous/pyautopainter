import { defineConfig } from 'vite';

export default defineConfig({
  base: '/static/webui/',
  build: {
    outDir: '../static/webui',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8001',
      '/progress.gif': 'http://127.0.0.1:8001',
      '/progress.jpg': 'http://127.0.0.1:8001',
      '/start': 'http://127.0.0.1:8001',
      '/status': 'http://127.0.0.1:8001',
      '/stop': 'http://127.0.0.1:8001',
    },
  },
});
