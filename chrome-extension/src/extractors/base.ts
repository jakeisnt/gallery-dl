/**
 * Base Instagram Extractor
 * Provides common functionality for all extractors
 */

import type { InstagramClient } from '../api/instagram-client';
import type {
  ExtractedMedia,
  MediaMetadata,
  InstagramPost,
  MediaItem,
  ImageCandidate,
  StoryItem,
} from '../types/instagram';
import {
  formatFilename,
  createTemplateData,
  getExtensionFromUrl,
  DEFAULT_TEMPLATE,
} from '../utils/filename';
import { idToShortcode } from '../utils/shortcode';

export interface ExtractorOptions {
  includeVideos?: boolean;
  includeImages?: boolean;
  filenameTemplate?: string;
  maxItems?: number;
}

export const DEFAULT_EXTRACTOR_OPTIONS: ExtractorOptions = {
  includeVideos: true,
  includeImages: true,
  filenameTemplate: DEFAULT_TEMPLATE,
};

/**
 * Abstract base class for Instagram extractors
 */
export abstract class InstagramExtractor {
  protected options: ExtractorOptions;

  constructor(
    protected client: InstagramClient,
    options: ExtractorOptions = {}
  ) {
    this.options = { ...DEFAULT_EXTRACTOR_OPTIONS, ...options };
  }

  /**
   * Check if this extractor can handle the given URL
   */
  abstract match(url: string): boolean;

  /**
   * Extract media from the given URL
   */
  abstract extract(url: string): AsyncGenerator<ExtractedMedia>;

  /**
   * Get a descriptive name for this extractor
   */
  abstract get name(): string;

  /**
   * Parse a post/media item and extract all media URLs
   */
  protected parsePost(post: InstagramPost): ExtractedMedia[] {
    const media: ExtractedMedia[] = [];
    const items: MediaItem[] = post.carousel_media || [post];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const carouselIndex = items.length > 1 ? i + 1 : undefined;

      // Build base metadata
      const baseMetadata: MediaMetadata = {
        postId: post.pk,
        shortcode: post.code || idToShortcode(post.pk),
        username: post.user?.username || '',
        timestamp: post.taken_at,
        caption: post.caption?.text,
        width: item.original_width || 0,
        height: item.original_height || 0,
        isCarousel: items.length > 1,
        carouselIndex,
        mediaType: this.getMediaType(post),
        likes: post.like_count,
        comments: post.comment_count,
      };

      // Extract video if present and enabled
      if (this.options.includeVideos && item.video_versions?.length) {
        const video = this.getBestVideo(item.video_versions);
        if (video) {
          const extension = 'mp4';
          media.push({
            url: video.url,
            type: 'video',
            filename: this.generateFilename(baseMetadata, extension, 'video'),
            extension,
            metadata: {
              ...baseMetadata,
              width: video.width || baseMetadata.width,
              height: video.height || baseMetadata.height,
            },
          });
        }
      }

      // Extract image if enabled (and no video, or both enabled)
      if (
        this.options.includeImages &&
        item.image_versions2?.candidates?.length
      ) {
        // Skip image if we already have video and both aren't needed
        if (
          !this.options.includeVideos ||
          !item.video_versions?.length ||
          this.options.includeImages
        ) {
          const image = this.getBestImage(item.image_versions2.candidates);
          if (image) {
            const extension = getExtensionFromUrl(image.url);
            media.push({
              url: image.url,
              type: 'image',
              filename: this.generateFilename(baseMetadata, extension, 'image'),
              extension,
              metadata: {
                ...baseMetadata,
                width: image.width || baseMetadata.width,
                height: image.height || baseMetadata.height,
              },
            });
          }
        }
      }
    }

    return media;
  }

  /**
   * Parse a story item and extract media
   */
  protected parseStoryItem(
    item: StoryItem,
    username: string
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
      mediaType: 'story',
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

    // Extract image
    if (this.options.includeImages && item.image_versions2?.candidates?.length) {
      // For stories, only include image if no video (stories are either/or)
      if (!item.video_versions?.length) {
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
    }

    return media;
  }

  /**
   * Get the best quality image from candidates
   */
  protected getBestImage(candidates: ImageCandidate[]): ImageCandidate | null {
    if (!candidates.length) return null;

    // Sort by resolution (width * height) descending
    return candidates.reduce((best, current) => {
      const bestRes = (best.width || 0) * (best.height || 0);
      const currentRes = (current.width || 0) * (current.height || 0);
      return currentRes > bestRes ? current : best;
    });
  }

  /**
   * Get the best quality video version
   */
  protected getBestVideo(
    versions: Array<{ url: string; width?: number; height?: number; type?: number }>
  ): { url: string; width?: number; height?: number } | null {
    if (!versions.length) return null;

    // Sort by resolution (width * height) descending
    return versions.reduce((best, current) => {
      const bestRes = (best.width || 0) * (best.height || 0);
      const currentRes = (current.width || 0) * (current.height || 0);
      return currentRes > bestRes ? current : best;
    });
  }

  /**
   * Generate a filename for the media
   */
  protected generateFilename(
    metadata: MediaMetadata,
    extension: string,
    type: 'image' | 'video'
  ): string {
    const templateData = createTemplateData(metadata, extension, type);
    return formatFilename(
      this.options.filenameTemplate || DEFAULT_TEMPLATE,
      templateData
    );
  }

  /**
   * Determine the media type from a post
   */
  protected getMediaType(
    post: InstagramPost
  ): 'post' | 'reel' | 'story' | 'highlight' {
    if (post.product_type === 'clips') {
      return 'reel';
    }
    return 'post';
  }
}

/**
 * Extractor registry type
 */
export interface ExtractorClass {
  new (client: InstagramClient, options?: ExtractorOptions): InstagramExtractor;
}
