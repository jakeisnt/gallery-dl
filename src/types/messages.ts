/**
 * Extension message types
 */

import type { ArenaChannel } from '../arena';

export type ExtensionMessage =
  | { type: 'GET_IMAGE_URL' }
  | { type: 'SEARCH_CHANNELS'; query: string }
  | { type: 'GET_CHANNELS' }
  | { type: 'CONNECT_IMAGE'; imageUrl: string; channelSlug: string };

export interface ImageUrlResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export interface ChannelsResponse {
  success: boolean;
  channels?: ArenaChannel[];
  error?: string;
}

export interface ConnectResponse {
  success: boolean;
  blockId?: number;
  channelSlug?: string;
  error?: string;
}
