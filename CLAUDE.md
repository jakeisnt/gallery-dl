# CLAUDE.md

## Project Overview

Chrome extension to connect Instagram images to Are.na channels.

## Commands

```bash
pnpm install    # Install dependencies
pnpm dev        # Development build with watch
pnpm build      # Production build
pnpm typecheck  # Type checking
pnpm lint       # Linting
```

## Architecture

```
src/
  background/index.ts  - Service worker (handles Are.na API calls)
  popup/               - React popup UI (channel search + connect)
  options/             - Settings page (Are.na token)
  arena/               - Are.na client (arena-ts wrapper)
  types/               - TypeScript types
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
