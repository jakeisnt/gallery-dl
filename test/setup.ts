/**
 * Test setup file
 * Configures testing environment with DOM matchers and Chrome API mocks
 */

import '@testing-library/jest-dom/vitest';
import { vi, beforeEach, afterAll } from 'vitest';
import { chromeMock, resetChromeMocks } from './mocks/chrome';

// Make chrome available globally
Object.defineProperty(globalThis, 'chrome', {
  value: chromeMock,
  writable: true,
});

// Reset all mocks between tests
beforeEach(() => {
  resetChromeMocks();
  vi.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
