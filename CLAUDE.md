# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

Instagram Downloader Chrome Extension - A TypeScript-based Chrome Manifest V3 extension for downloading images and videos from Instagram. Uses React for the popup/options UI and webpack for bundling.

## Commands

```bash
# Install dependencies
pnpm install

# Development build with watch mode
pnpm dev

# Production build
pnpm build

# Type checking
pnpm typecheck

# Linting
pnpm lint

# Run tests
pnpm test
```

## Architecture

### Entry Points (webpack)

- `src/background/index.ts` - Service worker (background script)
- `src/content/index.ts` - Content script injected into Instagram pages
- `src/popup/index.tsx` - React popup UI
- `src/options/index.tsx` - React options/settings page

### Key Directories

- `src/api/` - Instagram API client (`instagram-client.ts`) and error handling
- `src/arena/` - Are.na integration using arena-ts library
- `src/extractors/` - URL-specific content extractors:
  - `base.ts` - Base extractor class
  - `post.ts` - Single post/reel/IGTV extraction
  - `user.ts` - User profile and reels
  - `stories.ts` - Stories and highlights
  - `saved.ts` - Saved posts
- `src/content/` - Content script with DOM scraper for fallback extraction
- `src/download/` - Download manager using Chrome downloads API
- `src/utils/` - Utilities (filename templating, cookies, delays, shortcode handling)
- `src/types/` - TypeScript type definitions
- `public/` - Static assets (icons, HTML files)

### Build Output

Built files go to `dist/` which is loaded as an unpacked extension in Chrome.

## Chrome Extension Permissions

- `cookies` - Access Instagram session
- `storage` - Save settings and download history
- `downloads` - Download files via Chrome API
- `activeTab` - Access current tab URL
- Host permissions for `instagram.com` and CDN domains

## Technology Stack

- TypeScript 5.x
- React 18
- Webpack 5
- Chrome Extension Manifest V3
- pnpm (package manager)

## Development Workflow

1. Run `pnpm dev` for watch mode
2. Load `dist/` folder as unpacked extension in `chrome://extensions/`
3. Extension auto-reloads when files change
4. Check service worker console in `chrome://extensions/` for background script logs
