/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  root: 'app',
  base: './',
  plugins: [preact()],
  build: { outDir: '../dist', emptyOutDir: true },
  test: {
    root: '.',
    include: ['app/src/**/*.test.ts', 'app/src/**/*.test.tsx'],
    environment: 'node',
  },
});
