# Chrome Extension Conversion Plan: Instagram Image Downloader

## Executive Summary

This document outlines a plan to convert gallery-dl's Instagram functionality into a TypeScript-based Chrome extension. The extension will leverage the user's existing Instagram session to download images directly from the browser.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication Strategy](#authentication-strategy)
3. [Core Components](#core-components)
4. [Implementation Phases](#implementation-phases)
5. [API Endpoints](#api-endpoints)
6. [Data Models](#data-models)
7. [File Structure](#file-structure)
8. [Technical Considerations](#technical-considerations)

---

## Architecture Overview

### High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Extension                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Popup UI   │  │   Content    │  │    Background    │  │
│  │  (React/TS)  │  │   Script     │  │     Worker       │  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
│         │                 │                   │             │
│         ▼                 ▼                   ▼             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Core Instagram Module                    │  │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────────┐   │  │
│  │  │  Extractor │ │  API Client│ │ Download Manager│   │  │
│  │  └────────────┘ └────────────┘ └────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
         │                                      │
         ▼                                      ▼
┌─────────────────┐                  ┌─────────────────────┐
│ Instagram.com   │                  │  Chrome Downloads   │
│ (API + Cookies) │                  │       API           │
└─────────────────┘                  └─────────────────────┘
```

### Two Approaches

#### Approach A: DOM Scraping (Simple but Limited)
- Parse the current page's DOM to find image/video URLs
- Works for visible content only
- Limited by Instagram's lazy loading
- No authentication complexity

#### Approach B: API Integration (Complex but Powerful)
- Use Instagram's private REST/GraphQL APIs
- Access to all posts, stories, reels, saved items
- Requires session cookies from the browser
- Full feature parity with gallery-dl

**Recommended: Hybrid Approach**
- DOM scraping for quick single-post downloads
- API integration for bulk operations (user timeline, saved posts)

---

## Authentication Strategy

### Using Browser Cookies

The extension will leverage the user's existing Instagram session:

```typescript
// manifest.json permissions
{
  "permissions": [
    "cookies",
    "storage",
    "downloads"
  ],
  "host_permissions": [
    "https://www.instagram.com/*",
    "https://i.instagram.com/*"
  ]
}

// Cookie extraction
async function getInstagramCookies(): Promise<InstagramAuth> {
  const cookies = await chrome.cookies.getAll({
    domain: ".instagram.com"
  });

  const sessionId = cookies.find(c => c.name === "sessionid")?.value;
  const csrfToken = cookies.find(c => c.name === "csrftoken")?.value;

  if (!sessionId) {
    throw new Error("Not logged into Instagram");
  }

  return { sessionId, csrfToken };
}
```

### Required Cookies
- `sessionid` - Main authentication token
- `csrftoken` - CSRF protection token
- `ds_user_id` - User ID (optional, can be fetched)

---

## Core Components

### 1. Instagram API Client

```typescript
// src/api/instagram-client.ts

interface InstagramClientConfig {
  csrfToken: string;
  sessionId: string;
  appId?: string;
}

class InstagramClient {
  private baseUrl = "https://www.instagram.com/api";
  private graphqlUrl = "https://www.instagram.com/graphql/query/";
  private appId = "936619743392459";
  private wwwClaim = "0";

  constructor(private config: InstagramClientConfig) {}

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = this.baseUrl + endpoint;

    const headers: HeadersInit = {
      "Accept": "*/*",
      "X-CSRFToken": this.config.csrfToken,
      "X-IG-App-ID": this.appId,
      "X-IG-WWW-Claim": this.wwwClaim,
      "X-Requested-With": "XMLHttpRequest",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: "include", // Include cookies
    });

    if (!response.ok) {
      throw new InstagramApiError(response.status, await response.text());
    }

    // Update www-claim header if present
    const newClaim = response.headers.get("x-ig-set-www-claim");
    if (newClaim) {
      this.wwwClaim = newClaim;
    }

    return response.json();
  }

  // User endpoints
  async getUserByName(username: string): Promise<InstagramUser> {
    const data = await this.request<WebProfileInfoResponse>(
      `/v1/users/web_profile_info/?username=${username}`
    );
    return data.data.user;
  }

  async getUserById(userId: string): Promise<InstagramUser> {
    const data = await this.request<UserInfoResponse>(
      `/v1/users/${userId}/info/`
    );
    return data.user;
  }

  // Post endpoints
  async getMediaByShortcode(shortcode: string): Promise<InstagramPost> {
    const mediaId = shortcodeToId(shortcode);
    const data = await this.request<MediaInfoResponse>(
      `/v1/media/${mediaId}/info/`
    );
    return data.items[0];
  }

  async getUserFeed(userId: string, maxId?: string): Promise<FeedResponse> {
    const params = new URLSearchParams({ count: "30" });
    if (maxId) params.set("max_id", maxId);

    return this.request<FeedResponse>(
      `/v1/feed/user/${userId}/?${params}`
    );
  }

  async getReelsMedia(reelIds: string[]): Promise<ReelsMediaResponse> {
    const params = new URLSearchParams();
    reelIds.forEach(id => params.append("reel_ids", id));

    return this.request<ReelsMediaResponse>(
      `/v1/feed/reels_media/?${params}`
    );
  }

  async getHighlightsTray(userId: string): Promise<HighlightsTrayResponse> {
    return this.request<HighlightsTrayResponse>(
      `/v1/highlights/${userId}/highlights_tray/`
    );
  }

  async getSavedPosts(maxId?: string): Promise<SavedPostsResponse> {
    const params = new URLSearchParams({ count: "50" });
    if (maxId) params.set("max_id", maxId);

    return this.request<SavedPostsResponse>(
      `/v1/feed/saved/posts/?${params}`
    );
  }

  // Pagination helper
  async *paginate<T>(
    fetchFn: (maxId?: string) => Promise<PaginatedResponse<T>>
  ): AsyncGenerator<T> {
    let maxId: string | undefined;

    while (true) {
      const response = await fetchFn(maxId);

      for (const item of response.items) {
        yield item;
      }

      if (!response.more_available) {
        break;
      }

      maxId = response.next_max_id;

      // Rate limiting
      await this.sleep(randomDelay(3000, 6000));
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 2. Extractor Classes

```typescript
// src/extractors/base.ts

interface ExtractedMedia {
  url: string;
  type: "image" | "video";
  filename: string;
  extension: string;
  metadata: MediaMetadata;
}

interface MediaMetadata {
  postId: string;
  shortcode: string;
  username: string;
  timestamp: number;
  caption?: string;
  width: number;
  height: number;
  isCarousel: boolean;
  carouselIndex?: number;
}

abstract class InstagramExtractor {
  constructor(protected client: InstagramClient) {}

  abstract match(url: string): boolean;
  abstract extract(url: string): AsyncGenerator<ExtractedMedia>;

  protected parsePost(post: RawInstagramPost): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];
    const items = post.carousel_media || [post];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Get best quality image
      const image = this.getBestImage(item.image_versions2?.candidates || []);

      // Get video if present
      const video = item.video_versions?.[0];

      const baseMetadata: MediaMetadata = {
        postId: post.pk,
        shortcode: post.code,
        username: post.user?.username || "",
        timestamp: post.taken_at,
        caption: post.caption?.text,
        width: item.original_width || image?.width || 0,
        height: item.original_height || image?.height || 0,
        isCarousel: items.length > 1,
        carouselIndex: items.length > 1 ? i + 1 : undefined,
      };

      if (video) {
        media.push({
          url: video.url,
          type: "video",
          filename: this.generateFilename(baseMetadata, "video"),
          extension: "mp4",
          metadata: baseMetadata,
        });
      }

      if (image) {
        media.push({
          url: image.url,
          type: "image",
          filename: this.generateFilename(baseMetadata, "image"),
          extension: this.getExtension(image.url),
          metadata: baseMetadata,
        });
      }
    }

    return media;
  }

  protected getBestImage(candidates: ImageCandidate[]): ImageCandidate | null {
    if (!candidates.length) return null;
    return candidates.reduce((best, current) =>
      (current.width * current.height) > (best.width * best.height)
        ? current
        : best
    );
  }

  protected generateFilename(meta: MediaMetadata, type: string): string {
    const parts = [
      meta.username,
      meta.shortcode,
      meta.carouselIndex ? `_${meta.carouselIndex}` : "",
    ];
    return parts.join("_");
  }

  protected getExtension(url: string): string {
    const match = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return match?.[1]?.toLowerCase() || "jpg";
  }
}
```

```typescript
// src/extractors/post.ts

class PostExtractor extends InstagramExtractor {
  private pattern = /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/;

  match(url: string): boolean {
    return this.pattern.test(url);
  }

  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const match = url.match(this.pattern);
    if (!match) return;

    const shortcode = match[1];
    const post = await this.client.getMediaByShortcode(shortcode);

    for (const media of this.parsePost(post)) {
      yield media;
    }
  }
}
```

```typescript
// src/extractors/user.ts

class UserExtractor extends InstagramExtractor {
  private pattern = /instagram\.com\/([A-Za-z0-9_.]+)\/?$/;

  match(url: string): boolean {
    if (this.pattern.test(url)) {
      const username = url.match(this.pattern)?.[1];
      // Exclude reserved paths
      return !["p", "reel", "tv", "explore", "stories", "reels"].includes(
        username?.toLowerCase() || ""
      );
    }
    return false;
  }

  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const match = url.match(this.pattern);
    if (!match) return;

    const username = match[1];
    const user = await this.client.getUserByName(username);

    // Paginate through user's feed
    for await (const post of this.client.paginate(
      (maxId) => this.client.getUserFeed(user.id, maxId)
    )) {
      for (const media of this.parsePost(post)) {
        yield media;
      }
    }
  }
}
```

```typescript
// src/extractors/stories.ts

class StoriesExtractor extends InstagramExtractor {
  private pattern = /instagram\.com\/stories\/([A-Za-z0-9_.]+)/;

  match(url: string): boolean {
    return this.pattern.test(url);
  }

  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const match = url.match(this.pattern);
    if (!match) return;

    const username = match[1];
    const user = await this.client.getUserByName(username);
    const reels = await this.client.getReelsMedia([user.id]);

    for (const reel of reels.reels_media || []) {
      for (const item of reel.items || []) {
        for (const media of this.parseStoryItem(item, username)) {
          yield media;
        }
      }
    }
  }

  private parseStoryItem(item: StoryItem, username: string): ExtractedMedia[] {
    // Similar to parsePost but for stories
    // ...
  }
}
```

### 3. DOM Scraper (Fallback)

```typescript
// src/extractors/dom-scraper.ts

class DOMScraper {
  /**
   * Extract media URLs from the current Instagram page DOM
   * Used as fallback when API access fails or for quick single-post grabs
   */
  extractFromDOM(): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];

    // Method 1: Find image elements
    const images = document.querySelectorAll<HTMLImageElement>(
      'article img[srcset], article img[src*="instagram"]'
    );

    for (const img of images) {
      const srcset = img.srcset;
      if (srcset) {
        // Parse srcset to get highest resolution
        const urls = srcset.split(",").map(s => s.trim().split(" ")[0]);
        const bestUrl = urls[urls.length - 1];
        if (bestUrl) {
          media.push(this.createMediaFromUrl(bestUrl, "image"));
        }
      } else if (img.src) {
        media.push(this.createMediaFromUrl(img.src, "image"));
      }
    }

    // Method 2: Find video elements
    const videos = document.querySelectorAll<HTMLVideoElement>(
      'article video[src], article video source[src]'
    );

    for (const video of videos) {
      const src = video.src || video.querySelector("source")?.src;
      if (src) {
        media.push(this.createMediaFromUrl(src, "video"));
      }
    }

    // Method 3: Parse __NEXT_DATA__ or embedded JSON
    const nextData = this.extractNextData();
    if (nextData) {
      media.push(...this.parseNextData(nextData));
    }

    return media;
  }

  private extractNextData(): any | null {
    const script = document.querySelector(
      'script[type="application/json"][id="__NEXT_DATA__"]'
    );
    if (script) {
      try {
        return JSON.parse(script.textContent || "");
      } catch {
        return null;
      }
    }
    return null;
  }

  private parseNextData(data: any): ExtractedMedia[] {
    // Navigate the __NEXT_DATA__ structure to find media
    // This varies based on page type
    // ...
  }

  private createMediaFromUrl(url: string, type: "image" | "video"): ExtractedMedia {
    return {
      url,
      type,
      filename: this.filenameFromUrl(url),
      extension: type === "video" ? "mp4" : "jpg",
      metadata: {
        postId: "",
        shortcode: "",
        username: "",
        timestamp: Date.now() / 1000,
        width: 0,
        height: 0,
        isCarousel: false,
      },
    };
  }

  private filenameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split("/").pop()?.split(".")[0] || "instagram_media";
    } catch {
      return "instagram_media";
    }
  }
}
```

### 4. Download Manager

```typescript
// src/download/manager.ts

interface DownloadOptions {
  directory?: string;
  filenameTemplate?: string;
  skipExisting?: boolean;
}

class DownloadManager {
  private queue: ExtractedMedia[] = [];
  private isProcessing = false;
  private rateLimit = 1000; // ms between downloads

  async download(media: ExtractedMedia, options: DownloadOptions = {}): Promise<string> {
    const filename = this.formatFilename(media, options.filenameTemplate);

    // Use Chrome Downloads API
    const downloadId = await chrome.downloads.download({
      url: media.url,
      filename: options.directory
        ? `${options.directory}/${filename}`
        : filename,
      saveAs: false,
    });

    return new Promise((resolve, reject) => {
      chrome.downloads.onChanged.addListener(function listener(delta) {
        if (delta.id !== downloadId) return;

        if (delta.state?.current === "complete") {
          chrome.downloads.onChanged.removeListener(listener);
          resolve(filename);
        } else if (delta.error) {
          chrome.downloads.onChanged.removeListener(listener);
          reject(new Error(delta.error.current));
        }
      });
    });
  }

  async downloadBatch(
    mediaItems: ExtractedMedia[],
    options: DownloadOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<void> {
    const total = mediaItems.length;
    let completed = 0;

    for (const media of mediaItems) {
      try {
        await this.download(media, options);
        completed++;
        onProgress?.(completed, total);

        // Rate limiting
        await this.sleep(this.rateLimit);
      } catch (error) {
        console.error(`Failed to download: ${media.url}`, error);
      }
    }
  }

  private formatFilename(media: ExtractedMedia, template?: string): string {
    const defaultTemplate = "{username}_{shortcode}_{num}.{extension}";
    const tpl = template || defaultTemplate;

    return tpl
      .replace("{username}", media.metadata.username || "unknown")
      .replace("{shortcode}", media.metadata.shortcode || "unknown")
      .replace("{postId}", media.metadata.postId || "unknown")
      .replace("{num}", String(media.metadata.carouselIndex || 1))
      .replace("{extension}", media.extension)
      .replace("{timestamp}", String(media.metadata.timestamp));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 5. Utility Functions

```typescript
// src/utils/shortcode.ts

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

export function shortcodeToId(shortcode: string): string {
  let id = BigInt(0);

  for (const char of shortcode) {
    id = id * BigInt(64) + BigInt(ALPHABET.indexOf(char));
  }

  return id.toString();
}

export function idToShortcode(id: string | bigint): string {
  let num = typeof id === "string" ? BigInt(id) : id;
  let shortcode = "";

  while (num > 0n) {
    shortcode = ALPHABET[Number(num % 64n)] + shortcode;
    num = num / 64n;
  }

  return shortcode;
}

// src/utils/delay.ts

export function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
1. Set up TypeScript/React project with webpack/vite
2. Create manifest.json with required permissions
3. Implement authentication (cookie extraction)
4. Build basic InstagramClient with core API methods
5. Create PostExtractor for single post downloads

### Phase 2: Core Features (Week 3-4)
1. Implement DOM scraper as fallback
2. Build Download Manager with Chrome Downloads API
3. Create popup UI for:
   - Login status
   - Download current page button
   - Download settings
4. Add content script for on-page download buttons

### Phase 3: Advanced Extractors (Week 5-6)
1. UserExtractor (all posts from a user)
2. StoriesExtractor (stories and highlights)
3. SavedExtractor (saved posts)
4. Batch download queue with progress

### Phase 4: Polish & Optimization (Week 7-8)
1. Error handling and retry logic
2. Rate limiting and throttling
3. Options page (filename templates, directories)
4. Download history and archive
5. Testing and bug fixes

---

## File Structure

```
instagram-downloader-extension/
├── manifest.json
├── package.json
├── tsconfig.json
├── webpack.config.js
│
├── src/
│   ├── background/
│   │   ├── index.ts           # Service worker entry
│   │   └── message-handler.ts # Handle messages from popup/content
│   │
│   ├── content/
│   │   ├── index.ts           # Content script entry
│   │   ├── dom-scraper.ts     # DOM extraction
│   │   └── injector.ts        # Inject download buttons
│   │
│   ├── popup/
│   │   ├── index.tsx          # Popup React entry
│   │   ├── App.tsx            # Main popup component
│   │   ├── components/
│   │   │   ├── DownloadButton.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── Settings.tsx
│   │   └── hooks/
│   │       └── useInstagram.ts
│   │
│   ├── options/
│   │   └── index.tsx          # Options page
│   │
│   ├── api/
│   │   ├── instagram-client.ts
│   │   ├── types.ts           # API response types
│   │   └── errors.ts
│   │
│   ├── extractors/
│   │   ├── base.ts
│   │   ├── post.ts
│   │   ├── user.ts
│   │   ├── stories.ts
│   │   ├── saved.ts
│   │   └── index.ts           # Extractor registry
│   │
│   ├── download/
│   │   ├── manager.ts
│   │   └── queue.ts
│   │
│   ├── utils/
│   │   ├── shortcode.ts
│   │   ├── delay.ts
│   │   ├── filename.ts
│   │   └── cookies.ts
│   │
│   └── types/
│       ├── instagram.ts       # Instagram data types
│       ├── messages.ts        # Extension message types
│       └── storage.ts         # Chrome storage types
│
├── public/
│   ├── icons/
│   │   ├── icon16.png
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── popup.html
│   └── options.html
│
└── tests/
    ├── extractors/
    └── utils/
```

---

## manifest.json

```json
{
  "manifest_version": 3,
  "name": "Instagram Image Downloader",
  "version": "1.0.0",
  "description": "Download images and videos from Instagram",

  "permissions": [
    "cookies",
    "storage",
    "downloads",
    "activeTab"
  ],

  "host_permissions": [
    "https://www.instagram.com/*",
    "https://i.instagram.com/*",
    "https://*.cdninstagram.com/*"
  ],

  "background": {
    "service_worker": "background.js",
    "type": "module"
  },

  "content_scripts": [
    {
      "matches": ["https://www.instagram.com/*"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],

  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  "options_page": "options.html",

  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## API Endpoints Reference

Based on gallery-dl's Instagram extractor, here are the key API endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/users/web_profile_info/?username={user}` | GET | Get user info by username |
| `/v1/users/{userId}/info/` | GET | Get user info by ID |
| `/v1/media/{mediaId}/info/` | GET | Get post/media info |
| `/v1/feed/user/{userId}/` | GET | Get user's posts (paginated) |
| `/v1/feed/reels_media/` | GET | Get stories/reels |
| `/v1/highlights/{userId}/highlights_tray/` | GET | Get highlights list |
| `/v1/feed/saved/posts/` | GET | Get saved posts |
| `/v1/feed/collection/{id}/posts/` | GET | Get collection posts |
| `/v1/clips/user/` | POST | Get user's reels |
| `/v1/tags/{tag}/sections/` | POST | Get posts by hashtag |

### Required Headers

```typescript
{
  "Accept": "*/*",
  "X-CSRFToken": csrfToken,
  "X-IG-App-ID": "936619743392459",
  "X-IG-WWW-Claim": wwwClaim,  // Updated from responses
  "X-ASBD-ID": "129477",
  "X-Requested-With": "XMLHttpRequest",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin"
}
```

---

## Technical Considerations

### 1. Rate Limiting
Instagram aggressively rate-limits API requests. Implement:
- Random delays between requests (3-8 seconds)
- Exponential backoff on 429 responses
- Respect rate limit headers

### 2. CORS and Security
- Content scripts run in page context, can access Instagram APIs
- Background worker for download management
- Use `chrome.runtime.sendMessage` for communication

### 3. Cookie Expiration
- `sessionid` cookies expire after ~1 year
- Detect expired sessions and prompt re-login
- Consider cookie refresh strategies

### 4. Error Handling
- Network failures with retry
- Rate limit (429) handling
- Session expiration (401/403)
- Private account detection
- Challenge/captcha detection

### 5. Storage
Use `chrome.storage.local` for:
- Download history/archive
- User preferences
- Cached user data

### 6. Instagram Updates
Instagram frequently changes their API. Build with adaptability:
- Abstract API calls behind interface
- Log API responses for debugging
- Version detection for backwards compatibility

---

## Comparison: gallery-dl vs Chrome Extension

| Feature | gallery-dl | Chrome Extension |
|---------|-----------|------------------|
| Authentication | Cookies file / browser extraction | Direct browser cookies |
| Rate Limiting | Python sleep | setTimeout/setInterval |
| File Download | Python file I/O | Chrome Downloads API |
| URL Matching | Python regex | TypeScript regex |
| Pagination | Python generators | Async generators |
| Configuration | JSON/YAML files | chrome.storage |
| Error Handling | Exception classes | Error classes + types |

---

## Next Steps

1. **Set up project**: Initialize TypeScript + React + Webpack
2. **Create manifest**: Define permissions and entry points
3. **Implement auth**: Cookie extraction and validation
4. **Build API client**: Core Instagram API wrapper
5. **Create first extractor**: PostExtractor for single posts
6. **Build popup UI**: Basic download interface
7. **Test and iterate**: Ensure reliability

This plan provides a comprehensive roadmap for converting gallery-dl's Instagram functionality into a Chrome extension while maintaining feature parity and adapting to browser constraints.
