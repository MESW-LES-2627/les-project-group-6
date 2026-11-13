import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Local runs read credentials and fixture ids from .env.e2e; CI sets them as env.
if (existsSync('.env.e2e')) process.loadEnvFile('.env.e2e');

const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: './e2e',
  // One shared test user: tests must not run at the same time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'e2e/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
  // Local runs start both apps. In CI the workflow starts them first and these are reused.
  webServer: [
    {
      command: 'pnpm -C ../backend build && pnpm -C ../backend start',
      url: 'http://localhost:3000/health',
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'pnpm build-only && pnpm preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
