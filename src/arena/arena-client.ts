/**
 * Are.na client for connecting Instagram images to channels
 */

import { ArenaClient } from 'arena-ts';

export interface ArenaChannel {
  id: number;
  slug: string;
  title: string;
  status: 'public' | 'closed' | 'private';
}

export interface ArenaBlock {
  id: number;
  slug: string;
}

export class ArenaApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ArenaApiError';
  }
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/i.test(slug) && slug.length > 0 && slug.length <= 255;
}

function handleApiError(error: unknown): never {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('401') || message.includes('unauthorized')) {
      throw new ArenaApiError('Invalid Are.na access token. Please check your settings.', 401);
    }
    if (message.includes('403') || message.includes('forbidden')) {
      throw new ArenaApiError('Access denied. You may not have permission for this channel.', 403);
    }
    if (message.includes('404') || message.includes('not found')) {
      throw new ArenaApiError('Channel not found.', 404);
    }
    if (message.includes('429') || message.includes('rate limit')) {
      throw new ArenaApiError('Rate limited. Please wait a moment and try again.', 429, true);
    }
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      throw new ArenaApiError('Are.na service is temporarily unavailable. Please try again later.', 503, true);
    }
    if (message.includes('network') || message.includes('fetch')) {
      throw new ArenaApiError('Network error. Please check your connection.', undefined, true);
    }

    throw new ArenaApiError(error.message);
  }

  throw new ArenaApiError('An unexpected error occurred');
}

export class GalleryArenaClient {
  private client: ArenaClient | null = null;

  initialize(accessToken: string): void {
    if (!accessToken || accessToken.trim().length === 0) {
      throw new ArenaApiError('Access token is required');
    }
    this.client = new ArenaClient({ token: accessToken.trim() });
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async getChannels(): Promise<ArenaChannel[]> {
    if (!this.client) {
      throw new ArenaApiError('Are.na not configured. Add access token in settings.');
    }

    try {
      const me = await this.client.me();
      const channels = me.channels || [];
      return channels.map((ch: { id: number; slug: string; title: string; status: string }) => ({
        id: ch.id,
        slug: ch.slug,
        title: ch.title,
        status: ch.status as 'public' | 'closed' | 'private',
      }));
    } catch (error) {
      handleApiError(error);
    }
  }

  async searchChannels(query: string): Promise<ArenaChannel[]> {
    if (!this.client) {
      throw new ArenaApiError('Are.na not configured. Add access token in settings.');
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      throw new ArenaApiError('Search query is required');
    }
    if (trimmedQuery.length > 200) {
      throw new ArenaApiError('Search query is too long');
    }

    try {
      const results = await this.client.search.channels(trimmedQuery, { per: 20 });
      return results.channels.map((ch: { id: number; slug: string; title: string; status: string }) => ({
        id: ch.id,
        slug: ch.slug,
        title: ch.title,
        status: ch.status as 'public' | 'closed' | 'private',
      }));
    } catch (error) {
      handleApiError(error);
    }
  }

  async connectImage(imageUrl: string, channelSlug: string): Promise<ArenaBlock> {
    if (!this.client) {
      throw new ArenaApiError('Are.na not configured. Add access token in settings.');
    }

    if (!isValidUrl(imageUrl)) {
      throw new ArenaApiError('Invalid image URL');
    }
    if (!isValidSlug(channelSlug)) {
      throw new ArenaApiError('Invalid channel slug');
    }

    try {
      const block = await this.client.channel(channelSlug).createBlock({
        source: imageUrl,
      });
      return { id: block.id, slug: channelSlug };
    } catch (error) {
      handleApiError(error);
    }
  }
}

export const arenaClient = new GalleryArenaClient();
