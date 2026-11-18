import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
      exclude: ['src/**/*.{test,spec}.{js,jsx}', 'src/test/**'],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 80,
      },
    },
  },
}));
