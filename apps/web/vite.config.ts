import path from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig as defineViteConfig, mergeConfig } from 'vite';
import { defineConfig as defineVitestConfig } from 'vitest/config';

const viteConfig = defineViteConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});

const vitestConfig = defineVitestConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts'
  }
});

export default mergeConfig(viteConfig, vitestConfig);
