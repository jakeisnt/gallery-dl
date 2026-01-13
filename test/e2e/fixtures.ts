/**
 * Playwright fixtures for Chrome extension testing
 */

import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'path';

// Extension paths
const EXTENSION_PATH = path.join(__dirname, '..', '..', 'dist');

export type ExtensionFixtures = {
  context: BrowserContext;
  extensionId: string;
};

/**
 * Custom test fixture that loads the Chrome extension
 */
export const test = base.extend<ExtensionFixtures>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Wait for service worker to be ready
    let extensionId = '';

    // Get extension ID from service worker
    const serviceWorkers = context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      const extensionUrl = serviceWorkers[0].url();
      const match = extensionUrl.match(/chrome-extension:\/\/([^/]+)/);
      if (match) {
        extensionId = match[1];
      }
    }

    // If not found, wait for it
    if (!extensionId) {
      const worker = await context.waitForEvent('serviceworker');
      const extensionUrl = worker.url();
      const match = extensionUrl.match(/chrome-extension:\/\/([^/]+)/);
      if (match) {
        extensionId = match[1];
      }
    }

    await use(extensionId);
  },
});

export { expect } from '@playwright/test';

/**
 * Helper to get extension popup URL
 */
export function getPopupUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/popup.html`;
}

/**
 * Helper to get extension options URL
 */
export function getOptionsUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/options.html`;
}

/**
 * Helper to set extension storage (for setting up test state)
 */
export async function setExtensionStorage(
  context: BrowserContext,
  extensionId: string,
  data: Record<string, unknown>
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.evaluate((storageData) => {
    return new Promise<void>((resolve) => {
      chrome.storage.sync.set(storageData, resolve);
    });
  }, data);

  await page.close();
}

/**
 * Helper to clear extension storage
 */
export async function clearExtensionStorage(
  context: BrowserContext,
  extensionId: string
): Promise<void> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      chrome.storage.sync.clear(resolve);
    });
  });

  await page.close();
}
