import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const isCI = Boolean(process.env.CI);

/**
 * End-to-end tests run against a production build, which is what async
 * Server Components, Cache Components, and the proxy actually behave like.
 * Locally the config builds and starts the app for you; set `E2E_BASE_URL`
 * to point at an already-running server (or a preview deployment) instead.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `pnpm build && PORT=${PORT} pnpm start`,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 240_000,
        env: { NEXT_PUBLIC_APP_URL: baseURL, NEXT_TELEMETRY_DISABLED: '1' },
      },
});
