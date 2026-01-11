/**
 * DOM Scraper
 * Extracts media URLs from Instagram page DOM as a fallback method
 */

import type { ExtractedMedia, MediaMetadata, GraphQLMedia } from '../types/instagram';
import { getExtensionFromUrl, getFilenameFromUrl } from '../utils/filename';
import { extractShortcode, extractUsername } from '../utils/shortcode';

/**
 * DOM Scraper class
 * Extracts media from the current page's DOM
 */
export class DOMScraper {
  /**
   * Extract all media from the current page DOM
   */
  extractFromDOM(): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];

    // Try multiple extraction methods
    const nextDataMedia = this.extractFromNextData();
    if (nextDataMedia.length > 0) {
      media.push(...nextDataMedia);
    }

    // Fall back to image/video elements
    if (media.length === 0) {
      media.push(...this.extractFromElements());
    }

    // Deduplicate by URL
    return this.deduplicateMedia(media);
  }

  /**
   * Extract media from __NEXT_DATA__ script tag
   * This contains the full post data embedded in the page
   */
  private extractFromNextData(): ExtractedMedia[] {
    const script = document.querySelector(
      'script[type="application/json"][id="__NEXT_DATA__"]'
    );

    if (!script?.textContent) {
      return [];
    }

    try {
      const data = JSON.parse(script.textContent);
      return this.parseNextData(data);
    } catch {
      return [];
    }
  }

  /**
   * Parse __NEXT_DATA__ structure to find media
   */
  private parseNextData(data: unknown): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];

    // Navigate the data structure to find media
    // Structure varies by page type
    try {
      const props = (data as Record<string, unknown>).props as Record<string, unknown>;
      const pageProps = props?.pageProps as Record<string, unknown>;

      // Try to find post data
      if (pageProps) {
        // Single post page
        const post = this.findInObject(pageProps, 'shortcode_media');
        if (post) {
          media.push(...this.parseGraphQLMedia(post as GraphQLMedia));
        }

        // User profile page
        const user = this.findInObject(pageProps, 'edge_owner_to_timeline_media');
        if (user) {
          const edges = (user as Record<string, unknown>).edges as Array<{ node: GraphQLMedia }>;
          if (Array.isArray(edges)) {
            for (const edge of edges) {
              if (edge.node) {
                media.push(...this.parseGraphQLMedia(edge.node));
              }
            }
          }
        }
      }
    } catch {
      // Ignore parsing errors
    }

    return media;
  }

  /**
   * Recursively find a key in an object
   */
  private findInObject(obj: unknown, key: string): unknown {
    if (!obj || typeof obj !== 'object') {
      return null;
    }

    const record = obj as Record<string, unknown>;

    if (key in record) {
      return record[key];
    }

    for (const value of Object.values(record)) {
      if (value && typeof value === 'object') {
        const found = this.findInObject(value, key);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Parse GraphQL media structure
   */
  private parseGraphQLMedia(media: GraphQLMedia): ExtractedMedia[] {
    const results: ExtractedMedia[] = [];
    const username = media.owner?.username || '';
    const shortcode = media.shortcode || '';

    // Handle carousel/sidecar
    if (
      media.__typename === 'GraphSidecar' &&
      media.edge_sidecar_to_children?.edges
    ) {
      let index = 1;
      for (const edge of media.edge_sidecar_to_children.edges) {
        const child = edge.node;
        results.push(
          ...this.extractSingleMedia(child, username, shortcode, index++)
        );
      }
    } else {
      results.push(...this.extractSingleMedia(media, username, shortcode));
    }

    return results;
  }

  /**
   * Extract media from a single GraphQL node
   */
  private extractSingleMedia(
    node: GraphQLMedia,
    username: string,
    shortcode: string,
    carouselIndex?: number
  ): ExtractedMedia[] {
    const results: ExtractedMedia[] = [];

    const baseMetadata: MediaMetadata = {
      postId: node.id,
      shortcode: node.shortcode || shortcode,
      username,
      timestamp: node.taken_at_timestamp || Math.floor(Date.now() / 1000),
      caption: node.edge_media_to_caption?.edges?.[0]?.node?.text,
      width: node.dimensions?.width || 0,
      height: node.dimensions?.height || 0,
      isCarousel: carouselIndex !== undefined,
      carouselIndex,
      likes: node.edge_media_preview_like?.count,
    };

    // Video
    if (node.is_video && node.video_url) {
      results.push({
        url: node.video_url,
        type: 'video',
        filename: this.generateFilename(baseMetadata, 'mp4'),
        extension: 'mp4',
        metadata: baseMetadata,
      });
    }

    // Image (or fallback for videos)
    if (node.display_url) {
      const extension = getExtensionFromUrl(node.display_url);
      results.push({
        url: node.display_url,
        type: 'image',
        filename: this.generateFilename(baseMetadata, extension),
        extension,
        metadata: baseMetadata,
      });
    }

    return results;
  }

  /**
   * Extract media from DOM elements (fallback method)
   */
  private extractFromElements(): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];

    // Find images in articles
    const images = document.querySelectorAll<HTMLImageElement>(
      'article img[srcset], article img[src*="instagram"]'
    );

    for (const img of images) {
      const url = this.getBestImageUrl(img);
      if (url) {
        media.push(this.createMediaFromUrl(url, 'image'));
      }
    }

    // Find videos
    const videos = document.querySelectorAll<HTMLVideoElement>('article video');

    for (const video of videos) {
      const src = video.src || video.querySelector('source')?.src;
      if (src) {
        media.push(this.createMediaFromUrl(src, 'video'));
      }
    }

    return media;
  }

  /**
   * Get the highest resolution image URL from srcset
   */
  private getBestImageUrl(img: HTMLImageElement): string | null {
    const srcset = img.srcset;

    if (srcset) {
      // Parse srcset and get highest resolution
      const sources = srcset.split(',').map((s) => {
        const parts = s.trim().split(' ');
        return {
          url: parts[0],
          width: parseInt(parts[1]?.replace('w', '') || '0', 10),
        };
      });

      sources.sort((a, b) => b.width - a.width);

      if (sources.length > 0 && sources[0].url) {
        return sources[0].url;
      }
    }

    // Fall back to src
    if (img.src && img.src.includes('instagram')) {
      return img.src;
    }

    return null;
  }

  /**
   * Create media object from a URL (minimal metadata)
   */
  private createMediaFromUrl(
    url: string,
    type: 'image' | 'video'
  ): ExtractedMedia {
    const extension = type === 'video' ? 'mp4' : getExtensionFromUrl(url);
    const filename = getFilenameFromUrl(url);

    // Try to extract context from current page URL
    const pageUrl = window.location.href;
    const shortcode = extractShortcode(pageUrl) || '';
    const username = extractUsername(pageUrl) || '';

    const metadata: MediaMetadata = {
      postId: '',
      shortcode,
      username,
      timestamp: Math.floor(Date.now() / 1000),
      width: 0,
      height: 0,
      isCarousel: false,
    };

    return {
      url,
      type,
      filename: this.generateFilename(metadata, extension) || filename,
      extension,
      metadata,
    };
  }

  /**
   * Generate filename from metadata
   */
  private generateFilename(metadata: MediaMetadata, extension: string): string {
    const parts: string[] = [];

    if (metadata.username) {
      parts.push(metadata.username);
    }

    if (metadata.shortcode) {
      parts.push(metadata.shortcode);
    }

    if (metadata.carouselIndex) {
      parts.push(String(metadata.carouselIndex));
    }

    if (parts.length === 0) {
      parts.push('instagram_media');
      parts.push(String(Date.now()));
    }

    return `${parts.join('_')}.${extension}`;
  }

  /**
   * Remove duplicate media by URL
   */
  private deduplicateMedia(media: ExtractedMedia[]): ExtractedMedia[] {
    const seen = new Set<string>();
    return media.filter((item) => {
      if (seen.has(item.url)) {
        return false;
      }
      seen.add(item.url);
      return true;
    });
  }
}

/**
 * Create a DOM scraper instance
 */
export function createDOMScraper(): DOMScraper {
  return new DOMScraper();
}
