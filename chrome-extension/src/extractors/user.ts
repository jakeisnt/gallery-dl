/**
 * User Extractor
 * Extracts all posts from a user's profile
 */

import type { InstagramClient } from '../api/instagram-client';
import type { ExtractedMedia, InstagramUser } from '../types/instagram';
import { InstagramExtractor, ExtractorOptions } from './base';
import { extractUsername } from '../utils/shortcode';

/**
 * URL pattern for user profiles
 */
const USER_PATTERN = /instagram\.com\/([A-Za-z0-9_.]+)\/?(?:\?.*)?$/;

/**
 * Reserved paths that are not usernames
 */
const RESERVED_PATHS = [
  'p',
  'reel',
  'reels',
  'tv',
  'explore',
  'stories',
  'accounts',
  'direct',
  'about',
  'legal',
  'api',
  'developer',
  'static',
];

export class UserExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'User';
  }

  /**
   * Check if URL matches a user profile pattern
   */
  match(url: string): boolean {
    const match = url.match(USER_PATTERN);
    if (match) {
      const username = match[1].toLowerCase();
      return !RESERVED_PATHS.includes(username);
    }
    return false;
  }

  /**
   * Extract username from URL
   */
  private getUsername(url: string): string | null {
    const match = url.match(USER_PATTERN);
    if (match) {
      const username = match[1];
      if (!RESERVED_PATHS.includes(username.toLowerCase())) {
        return username;
      }
    }
    return null;
  }

  /**
   * Extract all media from a user's profile
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const username = this.getUsername(url);

    if (!username) {
      throw new Error(`Invalid user URL: ${url}`);
    }

    // Get user info
    const user = await this.client.getUserByName(username);

    if (user.is_private) {
      throw new Error(
        `User @${username} has a private account. You must follow them to view their content.`
      );
    }

    let count = 0;
    const maxItems = this.options.maxItems;

    // Paginate through user's feed
    for await (const post of this.client.paginateFeed(
      (maxId) => this.client.getUserFeed(user.pk, maxId),
      { maxItems }
    )) {
      const media = this.parsePost(post);

      for (const item of media) {
        yield item;
        count++;

        if (maxItems && count >= maxItems) {
          return;
        }
      }
    }
  }
}

/**
 * User Reels Extractor
 * Extracts all reels from a user's profile
 */
export class UserReelsExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'UserReels';
  }

  /**
   * Check if URL matches a user reels pattern
   */
  match(url: string): boolean {
    return /instagram\.com\/([A-Za-z0-9_.]+)\/reels\/?/.test(url);
  }

  /**
   * Extract username from URL
   */
  private getUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)\/reels\/?/);
    return match ? match[1] : null;
  }

  /**
   * Extract all reels from a user's profile
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const username = this.getUsername(url);

    if (!username) {
      throw new Error(`Invalid user reels URL: ${url}`);
    }

    const user = await this.client.getUserByName(username);

    if (user.is_private) {
      throw new Error(
        `User @${username} has a private account. You must follow them to view their content.`
      );
    }

    let count = 0;
    const maxItems = this.options.maxItems;

    for await (const post of this.client.paginateFeed(
      (maxId) => this.client.getUserClips(user.pk, maxId),
      { maxItems }
    )) {
      const media = this.parsePost(post);

      for (const item of media) {
        yield item;
        count++;

        if (maxItems && count >= maxItems) {
          return;
        }
      }
    }
  }
}

/**
 * User Tagged Extractor
 * Extracts posts where the user is tagged
 */
export class UserTaggedExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'UserTagged';
  }

  /**
   * Check if URL matches a user tagged pattern
   */
  match(url: string): boolean {
    return /instagram\.com\/([A-Za-z0-9_.]+)\/tagged\/?/.test(url);
  }

  /**
   * Extract username from URL
   */
  private getUsername(url: string): string | null {
    const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)\/tagged\/?/);
    return match ? match[1] : null;
  }

  /**
   * Extract all tagged posts
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const username = this.getUsername(url);

    if (!username) {
      throw new Error(`Invalid user tagged URL: ${url}`);
    }

    const user = await this.client.getUserByName(username);

    if (user.is_private) {
      throw new Error(
        `User @${username} has a private account. You must follow them to view their content.`
      );
    }

    let count = 0;
    const maxItems = this.options.maxItems;

    for await (const post of this.client.paginateFeed(
      (maxId) => this.client.getUserTagged(user.pk, maxId),
      { maxItems }
    )) {
      const media = this.parsePost(post);

      for (const item of media) {
        yield item;
        count++;

        if (maxItems && count >= maxItems) {
          return;
        }
      }
    }
  }
}
