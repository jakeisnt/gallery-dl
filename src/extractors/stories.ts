/**
 * Stories Extractor
 * Extracts stories and highlights from Instagram
 */

import type { InstagramClient } from '../api/instagram-client';
import type { ExtractedMedia, StoryItem, MediaMetadata } from '../types/instagram';
import { InstagramExtractor, ExtractorOptions } from './base';
import { getExtensionFromUrl } from '../utils/filename';
import { idToShortcode } from '../utils/shortcode';

/**
 * Stories Extractor
 * Extracts current stories from a user
 */
export class StoriesExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'Stories';
  }

  /**
   * Check if URL matches a stories pattern
   */
  match(url: string): boolean {
    return /instagram\.com\/stories\/([A-Za-z0-9_.]+)/.test(url);
  }

  /**
   * Extract username from URL
   */
  private getUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/stories\/([A-Za-z0-9_.]+)/);
    if (match) {
      const username = match[1];
      // 'highlights' is a special path, not a username
      if (username.toLowerCase() === 'highlights') {
        return null;
      }
      return username;
    }
    return null;
  }

  /**
   * Extract stories from a user
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const username = this.getUsername(url);

    if (!username) {
      throw new Error(`Invalid stories URL: ${url}`);
    }

    // Get user info
    const user = await this.client.getUserByName(username);

    // Get stories
    const reelsData = await this.client.getReelsMedia([user.pk]);

    const reel = reelsData.reels?.[user.pk] || reelsData.reels_media?.[0];

    if (!reel || !reel.items?.length) {
      return; // No stories available
    }

    for (const item of reel.items) {
      const media = this.parseStoryItem(item, username);

      for (const m of media) {
        yield m;
      }
    }
  }
}

/**
 * Highlights Extractor
 * Extracts story highlights from a user
 */
export class HighlightsExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'Highlights';
  }

  /**
   * Check if URL matches a highlights pattern
   */
  match(url: string): boolean {
    // Matches /stories/highlights/{id} or /{username}/highlights
    return (
      /instagram\.com\/stories\/highlights\/(\d+)/.test(url) ||
      /instagram\.com\/([A-Za-z0-9_.]+)\/highlights\/?$/.test(url)
    );
  }

  /**
   * Extract highlight ID or username from URL
   */
  private parseUrl(url: string): { type: 'id' | 'user'; value: string } | null {
    // Check for specific highlight ID
    const idMatch = url.match(/instagram\.com\/stories\/highlights\/(\d+)/);
    if (idMatch) {
      return { type: 'id', value: idMatch[1] };
    }

    // Check for user's highlights page
    const userMatch = url.match(
      /instagram\.com\/([A-Za-z0-9_.]+)\/highlights\/?$/
    );
    if (userMatch) {
      return { type: 'user', value: userMatch[1] };
    }

    return null;
  }

  /**
   * Extract highlights
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const parsed = this.parseUrl(url);

    if (!parsed) {
      throw new Error(`Invalid highlights URL: ${url}`);
    }

    if (parsed.type === 'id') {
      // Extract specific highlight
      yield* this.extractHighlight(parsed.value);
    } else {
      // Extract all highlights from user
      yield* this.extractAllHighlights(parsed.value);
    }
  }

  /**
   * Extract a single highlight by ID
   */
  private async *extractHighlight(
    highlightId: string
  ): AsyncGenerator<ExtractedMedia> {
    const reelId = `highlight:${highlightId}`;
    const reel = await this.client.getHighlightItems(reelId);

    if (!reel.items?.length) {
      return;
    }

    const username = reel.user?.username || '';

    for (const item of reel.items) {
      const media = this.parseStoryItemWithHighlight(item, username, highlightId);

      for (const m of media) {
        yield m;
      }
    }
  }

  /**
   * Extract all highlights from a user
   */
  private async *extractAllHighlights(
    username: string
  ): AsyncGenerator<ExtractedMedia> {
    const user = await this.client.getUserByName(username);
    const tray = await this.client.getHighlightsTray(user.pk);

    if (!tray.tray?.length) {
      return;
    }

    for (const highlight of tray.tray) {
      const highlightId = highlight.id.replace('highlight:', '');
      yield* this.extractHighlight(highlightId);
    }
  }

  /**
   * Parse story item with highlight context
   */
  private parseStoryItemWithHighlight(
    item: StoryItem,
    username: string,
    highlightId: string
  ): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];

    const baseMetadata: MediaMetadata = {
      postId: item.pk,
      shortcode: item.code || idToShortcode(item.pk),
      username,
      timestamp: item.taken_at,
      width: item.original_width || 0,
      height: item.original_height || 0,
      isCarousel: false,
      mediaType: 'highlight',
    };

    // Extract video if present
    if (this.options.includeVideos && item.video_versions?.length) {
      const video = this.getBestVideo(item.video_versions);
      if (video) {
        media.push({
          url: video.url,
          type: 'video',
          filename: this.generateFilename(baseMetadata, 'mp4', 'video'),
          extension: 'mp4',
          metadata: baseMetadata,
        });
      }
    }

    // Extract image (only if no video for stories)
    if (
      this.options.includeImages &&
      item.image_versions2?.candidates?.length &&
      !item.video_versions?.length
    ) {
      const image = this.getBestImage(item.image_versions2.candidates);
      if (image) {
        const extension = getExtensionFromUrl(image.url);
        media.push({
          url: image.url,
          type: 'image',
          filename: this.generateFilename(baseMetadata, extension, 'image'),
          extension,
          metadata: baseMetadata,
        });
      }
    }

    return media;
  }
}
