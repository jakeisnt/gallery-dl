# CLAUDE.md

## Project Overview

Chrome extension to connect Instagram images to Are.na channels.

## Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Development build with watch
pnpm build          # Production build
pnpm typecheck      # Type checking

# Testing
pnpm test           # Run unit & component tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage
pnpm test:e2e       # Run E2E tests (requires build)
pnpm test:all       # Run all tests
```

## Linting

Run ESLint to check for code quality issues:

```bash
pnpm lint           # Check src/ for lint errors
```

To add linting to CI, add this step to `.github/workflows/ci.yml`:

```yaml
- name: Run linting
  run: pnpm lint
```

The project uses ESLint with TypeScript support. Config is in `.eslintrc.json`.

## Architecture

```
src/
  background/index.ts  - Service worker (handles Are.na API calls)
  popup/               - React popup UI (channel search + connect)
  options/             - Settings page (Are.na token)
  arena/               - Are.na client (arena-ts wrapper)
  types/               - TypeScript types

test/
  setup.ts             - Test setup with Chrome mocks
  mocks/               - Chrome API mocks
  unit/                - Unit tests
  component/           - React component tests
  e2e/                 - Playwright E2E tests
```

## Flow

1. User opens popup on Instagram post
2. Background script extracts image URL via scripting API
3. User searches for Are.na channel
4. Background script calls Are.na API to create block

## Permissions

- `storage` - Save Are.na access token
- `activeTab` - Access current tab
- `scripting` - Execute script to get image URL

## Testing

See [TESTING.md](./TESTING.md) for detailed testing documentation.

Key points:
- Unit tests use Vitest with Chrome API mocks
- Component tests use Testing Library
- E2E tests use Playwright with real Chrome
- Coverage thresholds: 80% lines, 80% functions, 75% branches
