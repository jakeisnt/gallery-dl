# Testing Guide

This document describes the testing strategy and setup for the Instagram to Are.na Chrome extension.

## Overview

The extension uses a multi-layered testing approach:

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit Tests | Vitest | Test isolated functions and classes |
| Component Tests | Vitest + Testing Library | Test React components |
| E2E Tests | Playwright | Test full extension in browser |

## Running Tests

```bash
# Run all unit and component tests
pnpm test

# Run tests in watch mode (development)
pnpm test:watch

# Run tests with coverage report
pnpm test:coverage

# Open interactive UI for tests
pnpm test:ui

# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui

# Run E2E tests in headed mode (visible browser)
pnpm test:e2e:headed

# Run all tests (unit + E2E)
pnpm test:all
```

## Test Structure

```
test/
├── setup.ts                    # Test setup and global mocks
├── mocks/
│   └── chrome.ts               # Chrome API mocks
├── unit/
│   ├── arena-client.test.ts    # Are.na client tests
│   └── background.test.ts      # Background worker tests
├── component/
│   └── App.test.tsx            # Popup component tests
└── e2e/
    ├── fixtures.ts             # Playwright fixtures
    └── extension.spec.ts       # E2E extension tests
```

## Unit Tests

Unit tests verify isolated functionality without external dependencies.

### Are.na Client Tests (`arena-client.test.ts`)

Tests for the Are.na API client:
- Error class construction
- Client initialization
- Token validation
- URL/slug validation
- API error handling
- Channel operations (get, search, connect)

### Background Worker Tests (`background.test.ts`)

Tests for the service worker message handling:
- Message routing
- Image URL extraction
- Channel operations
- Error handling

## Component Tests

React component tests using Testing Library for realistic user interactions.

### App Component Tests (`App.test.tsx`)

Tests for the popup UI:
- Initial loading state
- Image preview display
- Channel list rendering
- Search functionality
- Connect to channel
- Error states
- Accessibility (ARIA)

## E2E Tests

End-to-end tests run in a real Chrome browser with the extension loaded.

### Prerequisites

1. Build the extension first: `pnpm build`
2. Install Playwright browsers: `npx playwright install chromium`

### Extension Tests (`extension.spec.ts`)

- Extension loading
- Popup rendering
- Options page functionality
- Storage operations
- Message passing

## Chrome API Mocks

The `test/mocks/chrome.ts` file provides comprehensive mocks for Chrome Extension APIs:

```typescript
import { chromeMock, resetChromeMocks } from './mocks/chrome';

// Set storage data
setStorageData({ accessToken: 'test-token' });

// Configure scripting result
setScriptingResult('https://example.com/image.jpg');

// Configure message response
setSendMessageResponse({ success: true, channels: [] });
```

### Available Mocks

- `chrome.storage.sync` - Sync storage operations
- `chrome.runtime` - Message passing and extension info
- `chrome.tabs` - Tab management
- `chrome.scripting` - Script injection

## Coverage Requirements

The project enforces minimum coverage thresholds:

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 75% |
| Statements | 80% |

View coverage report: `pnpm test:coverage` (opens in `coverage/` folder)

## CI Integration

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main`

CI Pipeline:
1. Type Check
2. Unit & Component Tests
3. Build Extension
4. E2E Tests

Artifacts:
- Coverage reports (7 days retention)
- Extension build (7 days retention)
- Playwright reports (7 days retention)

## Writing New Tests

### Unit Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('myFunction', () => {
  it('should do something', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Component Test Example

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<MyComponent />);

  await user.click(screen.getByRole('button'));

  expect(screen.getByText('Clicked')).toBeInTheDocument();
});
```

### E2E Test Example

```typescript
import { test, expect } from './fixtures';

test('should work in browser', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.locator('h1')).toContainText('Title');
});
```

## Troubleshooting

### Tests failing with Chrome mock errors

Ensure `test/setup.ts` is configured in `vitest.config.ts`:
```typescript
setupFiles: ['./test/setup.ts']
```

### E2E tests not finding extension

1. Build the extension: `pnpm build`
2. Check `dist/` folder exists
3. Ensure manifest.json is in `dist/`

### Coverage not meeting thresholds

1. Add tests for uncovered code
2. Check coverage report: `coverage/index.html`
3. Adjust thresholds if appropriate

### Playwright not launching

1. Install browsers: `npx playwright install chromium --with-deps`
2. Check for headless mode issues (E2E needs headed mode for extensions)
