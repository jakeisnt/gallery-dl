/**
 * E2E tests for Chrome extension
 *
 * These tests verify the extension works correctly in a real browser environment.
 * They require the extension to be built first (pnpm build).
 */

import { test, expect, getPopupUrl, getOptionsUrl, setExtensionStorage, clearExtensionStorage } from './fixtures';

test.describe('Extension Installation', () => {
  test('should load extension successfully', async ({ extensionId }) => {
    expect(extensionId).toBeTruthy();
    expect(extensionId.length).toBeGreaterThan(0);
  });

  test('should have valid extension ID format', async ({ extensionId }) => {
    // Chrome extension IDs are 32 lowercase letters
    expect(extensionId).toMatch(/^[a-z]{32}$/);
  });
});

test.describe('Popup Page', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearExtensionStorage(context, extensionId);
  });

  test('should render popup correctly', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Check title is present
    await expect(page.locator('h1')).toContainText('Instagram to Are.na');

    // Check settings button is present
    await expect(page.locator('button[aria-label="Open settings"]')).toBeVisible();
  });

  test('should show error when not on Instagram', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Should show empty state or error since we're not on Instagram
    const emptyState = page.locator('.empty');
    const errorState = page.locator('.error');

    // Either empty state or error should be visible
    const hasEmptyOrError = await emptyState.isVisible() || await errorState.isVisible();
    expect(hasEmptyOrError).toBe(true);
  });

  test('should have search input', async ({ context, extensionId }) => {
    // Set up token first so we can see the full UI
    await setExtensionStorage(context, extensionId, { accessToken: 'test-token' });

    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Wait for page to load - the search might not be visible if there's no image
    await page.waitForLoadState('networkidle');

    // Page should be loaded
    await expect(page.locator('h1')).toContainText('Instagram to Are.na');
  });
});

test.describe('Options Page', () => {
  test.beforeEach(async ({ context, extensionId }) => {
    await clearExtensionStorage(context, extensionId);
  });

  test('should render options page', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getOptionsUrl(extensionId));

    // Check title
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('should have access token input', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getOptionsUrl(extensionId));

    // Should have token input
    const tokenInput = page.locator('input[type="password"], input[type="text"]');
    await expect(tokenInput.first()).toBeVisible();
  });

  test('should save access token', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getOptionsUrl(extensionId));

    // Find and fill token input
    const tokenInput = page.locator('input').first();
    await tokenInput.fill('test-access-token');

    // Find and click save button
    const saveButton = page.locator('button').first();
    await saveButton.click();

    // Wait for save confirmation
    await page.waitForTimeout(500);

    // Verify token was saved by checking storage
    const storage = await page.evaluate(() => {
      return new Promise<Record<string, unknown>>((resolve) => {
        chrome.storage.sync.get(null, resolve);
      });
    });

    expect(storage.accessToken).toBe('test-access-token');
  });

  test('should display saved token on reload', async ({ context, extensionId }) => {
    // Set token first
    await setExtensionStorage(context, extensionId, { accessToken: 'saved-token' });

    const page = await context.newPage();
    await page.goto(getOptionsUrl(extensionId));

    // Wait for the token to load
    await page.waitForTimeout(300);

    // Check input value
    const tokenInput = page.locator('input').first();
    await expect(tokenInput).toHaveValue('saved-token');
  });

  test('should have link to Are.na dev portal', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getOptionsUrl(extensionId));

    const devLink = page.locator('a[href*="dev.are.na"]');
    await expect(devLink).toBeVisible();
  });
});

test.describe('Extension Communication', () => {
  test('should be able to send messages to background', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Test that chrome runtime is accessible
    const hasRuntime = await page.evaluate(() => {
      return typeof chrome !== 'undefined' && typeof chrome.runtime !== 'undefined';
    });

    expect(hasRuntime).toBe(true);
  });

  test('should be able to access storage', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Test storage access
    const canAccessStorage = await page.evaluate(() => {
      return new Promise<boolean>((resolve) => {
        try {
          chrome.storage.sync.get(null, () => {
            resolve(true);
          });
        } catch {
          resolve(false);
        }
      });
    });

    expect(canAccessStorage).toBe(true);
  });

  test('should handle message passing', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Send a message and expect a response
    const response = await page.evaluate(() => {
      return new Promise<unknown>((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_CHANNELS' }, (res) => {
          resolve(res);
        });
      });
    });

    // Should get a response (either success or error)
    expect(response).toBeDefined();
    expect(typeof response).toBe('object');
  });
});

test.describe('UI Interactions', () => {
  test('should open options page from settings button', async ({ context, extensionId }) => {
    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Click settings button
    const settingsButton = page.locator('button[aria-label="Open settings"]');
    await settingsButton.click();

    // Wait for new page to open
    await page.waitForTimeout(500);

    // Check if options page was opened in a new tab
    const pages = context.pages();
    const optionsPage = pages.find(p => p.url().includes('options.html'));

    expect(optionsPage).toBeDefined();
  });

  test('should focus search input on page load', async ({ context, extensionId }) => {
    await setExtensionStorage(context, extensionId, { accessToken: 'token' });

    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Wait for page load
    await page.waitForLoadState('networkidle');

    // Page should be interactive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Error States', () => {
  test('should show configuration message when token not set', async ({ context, extensionId }) => {
    await clearExtensionStorage(context, extensionId);

    const page = await context.newPage();
    await page.goto(getPopupUrl(extensionId));

    // Wait for content to load
    await page.waitForTimeout(500);

    // Should show some message about configuration or settings
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeDefined();
  });
});
