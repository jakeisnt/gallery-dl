/**
 * Post Extractor
 * Extracts media from single Instagram posts, reels, and TV videos
 */

import type { InstagramClient } from '../api/instagram-client';
import type { ExtractedMedia } from '../types/instagram';
import { InstagramExtractor, ExtractorOptions } from './base';
import { extractShortcode } from '../utils/shortcode';

/**
 * URL patterns for posts, reels, and IGTV
 */
const POST_PATTERNS = [
  /instagram\.com\/p\/([A-Za-z0-9_-]+)/,
  /instagram\.com\/reel\/([A-Za-z0-9_-]+)/,
  /instagram\.com\/reels?\/([A-Za-z0-9_-]+)/,
  /instagram\.com\/tv\/([A-Za-z0-9_-]+)/,
];

export class PostExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'Post';
  }

  /**
   * Check if URL matches a post pattern
   */
  match(url: string): boolean {
    return POST_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * Extract shortcode from URL
   */
  private getShortcode(url: string): string | null {
    for (const pattern of POST_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Extract media from a post URL
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const shortcode = this.getShortcode(url);

    if (!shortcode) {
      throw new Error(`Invalid post URL: ${url}`);
    }

    const post = await this.client.getMediaByShortcode(shortcode);
    const media = this.parsePost(post);

    for (const item of media) {
      yield item;
    }
  }
}
