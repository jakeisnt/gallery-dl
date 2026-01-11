/**
 * Are.na client wrapper for the gallery-dl extension
 * Provides methods to connect downloaded Instagram media to Are.na channels
 */

import { ArenaClient, type GetChannelsApiResponse } from 'arena-ts';
import type {
  ArenaConfig,
  ArenaChannelRef,
  ArenaBlockResult,
  CreateArenaBlockOptions,
  ArenaConnectionStatus,
} from '../types/arena';
import type { MediaMetadata } from '../types/instagram';

/**
 * Gallery Arena Client
 * Wraps arena-ts to provide extension-specific functionality
 */
export class GalleryArenaClient {
  private client: ArenaClient | null = null;
  private accessToken: string = '';

  constructor(accessToken?: string) {
    if (accessToken) {
      this.initialize(accessToken);
    }
  }

  /**
   * Initialize or reinitialize the client with an access token
   */
  initialize(accessToken: string): void {
    this.accessToken = accessToken;
    this.client = new ArenaClient({ token: accessToken });
  }

  /**
   * Check if the client is configured with an access token
   */
  isConfigured(): boolean {
    return this.client !== null && this.accessToken.length > 0;
  }

  /**
   * Get the current configuration status
   */
  getConfig(): ArenaConfig {
    return {
      accessToken: this.accessToken || undefined,
      isAuthenticated: this.isConfigured(),
    };
  }

  /**
   * Test the connection and get user info
   */
  async testConnection(): Promise<ArenaConnectionStatus> {
    if (!this.client) {
      return {
        connected: false,
        error: 'Client not initialized. Please provide an access token.',
      };
    }

    try {
      const user = await this.client.me();
      return {
        connected: true,
        username: user.username,
        userId: user.id,
        channelCount: user.channel_count,
        lastChecked: Date.now(),
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: Date.now(),
      };
    }
  }

  /**
   * Get the user's channels via the me() endpoint
   */
  async getChannels(): Promise<ArenaChannelRef[]> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    const me = await this.client.me();
    const channels: GetChannelsApiResponse[] = me.channels || [];

    return channels.map((channel: GetChannelsApiResponse) => ({
      id: channel.id,
      slug: channel.slug,
      title: channel.title,
      status: channel.status as 'public' | 'closed' | 'private',
      length: channel.length,
    }));
  }

  /**
   * Get details about a specific channel
   */
  async getChannel(slug: string): Promise<ArenaChannelRef | null> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      const channel = await this.client.channel(slug).get();
      return {
        id: channel.id,
        slug: channel.slug,
        title: channel.title,
        status: channel.status as 'public' | 'closed' | 'private',
        length: channel.length,
      };
    } catch {
      return null;
    }
  }

  /**
   * Create a block in an Are.na channel from a source URL
   * Note: arena-ts createBlock doesn't support title directly,
   * so title info should be included in the description if needed
   */
  async createBlock(options: CreateArenaBlockOptions): Promise<ArenaBlockResult> {
    if (!this.client) {
      return {
        success: false,
        channelSlug: options.channelSlug,
        error: 'Client not initialized',
      };
    }

    try {
      // Build description with title prefix if title is provided
      let description = options.description;
      if (options.title && description) {
        description = `${options.title}\n\n${description}`;
      } else if (options.title) {
        description = options.title;
      }

      const block = await this.client.channel(options.channelSlug).createBlock({
        source: options.source,
        description,
      });

      return {
        success: true,
        blockId: block.id,
        channelSlug: options.channelSlug,
      };
    } catch (error) {
      return {
        success: false,
        channelSlug: options.channelSlug,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create a block from Instagram media with metadata
   */
  async createBlockFromInstagram(
    sourceUrl: string,
    channelSlug: string,
    metadata: MediaMetadata,
    includeMetadata: boolean = true
  ): Promise<ArenaBlockResult> {
    const title = this.formatTitle(metadata);
    const description = includeMetadata
      ? this.formatDescription(metadata)
      : undefined;

    return this.createBlock({
      channelSlug,
      source: sourceUrl,
      title,
      description,
    });
  }

  /**
   * Connect an existing block to a channel
   */
  async connectBlockToChannel(
    blockId: number,
    channelSlug: string
  ): Promise<ArenaBlockResult> {
    if (!this.client) {
      return {
        success: false,
        channelSlug,
        error: 'Client not initialized',
      };
    }

    try {
      await this.client.channel(channelSlug).connect.block(blockId);
      return {
        success: true,
        blockId,
        channelSlug,
      };
    } catch (error) {
      return {
        success: false,
        channelSlug,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Create multiple blocks from a list of URLs
   */
  async createBlocks(
    sources: Array<{ url: string; metadata?: MediaMetadata }>,
    channelSlug: string,
    includeMetadata: boolean = true
  ): Promise<ArenaBlockResult[]> {
    const results: ArenaBlockResult[] = [];

    for (const source of sources) {
      let result: ArenaBlockResult;

      if (source.metadata) {
        result = await this.createBlockFromInstagram(
          source.url,
          channelSlug,
          source.metadata,
          includeMetadata
        );
      } else {
        result = await this.createBlock({
          channelSlug,
          source: source.url,
        });
      }

      results.push(result);

      // Add a small delay between requests to avoid rate limiting
      await this.delay(500);
    }

    return results;
  }

  /**
   * Format a title from Instagram metadata
   */
  private formatTitle(metadata: MediaMetadata): string {
    const parts = [`@${metadata.username}`];

    if (metadata.mediaType) {
      parts.push(metadata.mediaType);
    }

    if (metadata.shortcode) {
      parts.push(metadata.shortcode);
    }

    return parts.join(' - ');
  }

  /**
   * Format a description from Instagram metadata
   */
  private formatDescription(metadata: MediaMetadata): string {
    const lines: string[] = [];

    if (metadata.caption) {
      lines.push(metadata.caption);
      lines.push('');
    }

    lines.push(`Source: https://instagram.com/p/${metadata.shortcode}/`);
    lines.push(`User: @${metadata.username}`);
    lines.push(`Date: ${new Date(metadata.timestamp * 1000).toISOString()}`);

    if (metadata.likes !== undefined) {
      lines.push(`Likes: ${metadata.likes}`);
    }

    if (metadata.isCarousel && metadata.carouselIndex !== undefined) {
      lines.push(`Carousel item: ${metadata.carouselIndex + 1}`);
    }

    return lines.join('\n');
  }

  /**
   * Helper to add delay between requests
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export a singleton instance (can be reconfigured)
export const arenaClient = new GalleryArenaClient();
