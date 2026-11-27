import { defineConfig, devices } from '@playwright/test';

/** F-READ-01: deterministic browser checks without a backend or shared account. */
export default defineConfig({
  testDir: './e2e',
  testMatch: /continue-session\.spec\.ts/,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4176', trace: 'off', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: {
    command:
      'corepack pnpm build-only --outDir dist-ssr/session && corepack pnpm preview --outDir dist-ssr/session --port 4176 --strictPort',
    env: {
      VITE_SUPABASE_URL: 'https://session.test.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'public-test-key',
      VITE_API_BASE_URL: '/api',
    },
    url: 'http://localhost:4176',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
