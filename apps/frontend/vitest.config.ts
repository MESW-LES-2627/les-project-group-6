import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov', 'json-summary'],
        // CI fails below this. Keep in sync with the backend's --test-coverage-lines.
        thresholds: { lines: 95 },
        include: ['src/**/*.{ts,vue}'],
        // No logic to break: entry point, type declarations and dev mocks.
        exclude: [
          'src/main.ts',
          'src/types/**',
          'src/mocks/**',
          'src/**/*.d.ts',
          'src/**/__tests__/**',
        ],
      },
    },
  }),
);
