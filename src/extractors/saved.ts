/**
 * Saved Posts Extractor
 * Extracts saved posts and collections from Instagram
 */

import type { InstagramClient } from '../api/instagram-client';
import type { ExtractedMedia } from '../types/instagram';
import { InstagramExtractor, ExtractorOptions } from './base';

/**
 * Saved Posts Extractor
 * Extracts all saved posts from the logged-in user
 */
export class SavedExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'Saved';
  }

  /**
   * Check if URL matches the saved posts pattern
   */
  match(url: string): boolean {
    return /instagram\.com\/[A-Za-z0-9_.]+\/saved\/?$/.test(url);
  }

  /**
   * Extract all saved posts
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    let count = 0;
    const maxItems = this.options.maxItems;

    for await (const post of this.client.paginateSaved(
      (maxId) => this.client.getSavedPosts(maxId),
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
 * Saved Collection Extractor
 * Extracts posts from a specific saved collection
 */
export class SavedCollectionExtractor extends InstagramExtractor {
  constructor(client: InstagramClient, options: ExtractorOptions = {}) {
    super(client, options);
  }

  get name(): string {
    return 'SavedCollection';
  }

  /**
   * Check if URL matches a saved collection pattern
   */
  match(url: string): boolean {
    return /instagram\.com\/[A-Za-z0-9_.]+\/saved\/([A-Za-z0-9_-]+)\//.test(
      url
    );
  }

  /**
   * Extract collection ID from URL
   */
  private getCollectionId(url: string): string | null {
    const match = url.match(
      /instagram\.com\/[A-Za-z0-9_.]+\/saved\/([A-Za-z0-9_-]+)\//
    );
    return match ? match[1] : null;
  }

  /**
   * Extract posts from a saved collection
   */
  async *extract(url: string): AsyncGenerator<ExtractedMedia> {
    const collectionId = this.getCollectionId(url);

    if (!collectionId) {
      throw new Error(`Invalid saved collection URL: ${url}`);
    }

    let count = 0;
    const maxItems = this.options.maxItems;

    for await (const post of this.client.paginateSaved(
      (maxId) => this.client.getSavedCollection(collectionId, maxId),
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
