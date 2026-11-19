import { defineConfig, devices } from '@playwright/test';

/** Deterministic frontend-only auth regression suite; no database or live email. */
export default defineConfig({
  testDir: './e2e',
  testMatch: /recovery\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4175', trace: 'off', screenshot: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command:
      'pnpm build-only --outDir dist-ssr/recovery && pnpm preview --outDir dist-ssr/recovery --port 4175 --strictPort',
    env: {
      VITE_SUPABASE_URL: 'https://recovery.test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
      VITE_API_BASE_URL: '/api',
    },
    url: 'http://localhost:4175',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
