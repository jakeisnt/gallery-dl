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

export class GalleryArenaClient {
  private client: ArenaClient | null = null;

  initialize(accessToken: string): void {
    this.client = new ArenaClient({ token: accessToken });
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  async getChannels(): Promise<ArenaChannel[]> {
    if (!this.client) throw new Error('Not configured');

    const me = await this.client.me();
    return (me.channels || []).map((ch: any) => ({
      id: ch.id,
      slug: ch.slug,
      title: ch.title,
      status: ch.status,
    }));
  }

  async searchChannels(query: string): Promise<ArenaChannel[]> {
    if (!this.client) throw new Error('Not configured');

    const results = await this.client.search.channels(query, { per: 20 });
    return results.channels.map((ch: any) => ({
      id: ch.id,
      slug: ch.slug,
      title: ch.title,
      status: ch.status,
    }));
  }

  async connectImage(imageUrl: string, channelSlug: string): Promise<number> {
    if (!this.client) throw new Error('Not configured');

    const block = await this.client.channel(channelSlug).createBlock({
      source: imageUrl,
    });
    return block.id;
  }
}

export const arenaClient = new GalleryArenaClient();
