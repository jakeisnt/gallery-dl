# Instagram Downloader Chrome Extension

A TypeScript-based Chrome extension for downloading images and videos from Instagram. This extension leverages your existing Instagram session to access content without requiring separate authentication.

## Features

- Download single posts, reels, and IGTV videos
- Download all posts from a user's profile
- Download stories and highlights
- Download saved posts
- Batch downloading with progress tracking
- Configurable filename templates
- Rate limiting to avoid detection

## Installation

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder

### Development with Watch Mode

```bash
npm run dev
```

This will automatically rebuild when files change.

## Project Structure

```
chrome-extension/
├── manifest.json          # Extension manifest
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── webpack.config.js      # Build config
│
├── src/
│   ├── api/               # Instagram API client
│   ├── background/        # Service worker
│   ├── content/           # Content script + DOM scraper
│   ├── download/          # Download manager
│   ├── extractors/        # URL-specific extractors
│   ├── options/           # Settings page
│   ├── popup/             # Popup UI (React)
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
│
├── public/
│   ├── icons/             # Extension icons
│   ├── popup.html         # Popup HTML
│   └── options.html       # Options HTML
│
└── dist/                  # Build output (generated)
```

## Usage

1. Navigate to any Instagram page
2. Click the extension icon in the toolbar
3. Click "Scan for Media" to detect downloadable content
4. Click "Download All" or individual items

## Supported URL Types

- Posts: `instagram.com/p/{shortcode}`
- Reels: `instagram.com/reel/{shortcode}`
- IGTV: `instagram.com/tv/{shortcode}`
- User profiles: `instagram.com/{username}`
- User reels: `instagram.com/{username}/reels`
- Stories: `instagram.com/stories/{username}`
- Highlights: `instagram.com/stories/highlights/{id}`
- Saved posts: `instagram.com/{username}/saved`

## Configuration

Access settings via the extension options page:

- **Download Directory**: Subfolder in Downloads
- **Filename Template**: Customize filenames
- **Include Videos/Images**: Toggle media types
- **Rate Limiting**: Adjust delays between requests
- **Notifications**: Enable/disable download notifications

### Filename Template Variables

- `{username}` - Instagram username
- `{shortcode}` - Post shortcode
- `{postId}` - Numeric post ID
- `{num}` - Item number in carousel
- `{timestamp}` - Unix timestamp
- `{date}` - Date (YYYYMMDD)
- `{extension}` - File extension

## Architecture

This extension is based on [gallery-dl](https://github.com/mikf/gallery-dl)'s Instagram extractor, converted to TypeScript for browser use.

### Key Components

- **InstagramClient**: Handles API requests with proper headers
- **Extractors**: URL-matched handlers for different content types
- **DOMScraper**: Fallback extraction from page HTML
- **DownloadManager**: Manages downloads via Chrome's API

## Permissions

- `cookies`: Access Instagram session
- `storage`: Save settings and history
- `downloads`: Download files
- `activeTab`: Access current tab URL
- Host permissions for Instagram domains

## License

This project is part of gallery-dl. See the main repository for license information.
