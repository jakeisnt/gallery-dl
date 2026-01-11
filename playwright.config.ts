import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Playwright configuration for Chrome extension E2E testing
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false, // Extensions need sequential tests
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for extension testing
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-extension',
      use: {
        ...devices['Desktop Chrome'],
        // Launch with extension
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.join(__dirname, 'dist')}`,
            `--load-extension=${path.join(__dirname, 'dist')}`,
            '--no-sandbox',
            '--disable-setuid-sandbox',
          ],
        },
      },
    },
  ],
  // Build extension before running tests
  webServer: {
    command: 'pnpm build',
    cwd: __dirname,
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
