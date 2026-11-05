import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (Phase 5 "Done when"). CI builds the app, seeds a fresh MySQL database and starts the
 * production server; these tests then drive a real browser against it.
 */
const PORT = 3200;
const env = {
  NODE_ENV: 'production',
  APP_ENV: 'production',
  PORT: String(PORT),
  SITE_URL: `http://localhost:${PORT}`,
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'mysql://root:root@127.0.0.1:3306/meetoluwaseyi_test',
  SESSION_SECRET: 'e2e-only-secret-e2e-only-secret-e2e-only',
  IP_HASH_SALT: 'e2e-only-salt-123456',
  ADMIN_EMAIL: 'owner@example.com',
};

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] }, grep: /@phone/ },
  ],
  globalSetup: './e2e/global-setup.ts',
  webServer: {
    command: 'node dist/jobs/cli.js seed --force && node app.cjs',
    url: `http://localhost:${PORT}/healthz`,
    reuseExistingServer: false,
    timeout: 60_000,
    env,
  },
});

export { env as E2E_ENV };
