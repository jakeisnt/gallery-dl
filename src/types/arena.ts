/**
 * Are.na integration types
 * Types for connecting downloaded media to Are.na channels
 */

// Are.na authentication configuration
export interface ArenaConfig {
  accessToken?: string;
  isAuthenticated: boolean;
}

// Are.na channel reference
export interface ArenaChannelRef {
  id: number;
  slug: string;
  title: string;
  status: 'public' | 'closed' | 'private';
  length: number;
}

// Result of adding a block to Are.na
export interface ArenaBlockResult {
  success: boolean;
  blockId?: number;
  channelSlug: string;
  error?: string;
}

// Options for creating a block in Are.na
export interface CreateArenaBlockOptions {
  channelSlug: string;
  source: string; // URL of the image/media
  title?: string;
  description?: string;
}

// User's Are.na settings stored in preferences
export interface ArenaSettings {
  enabled: boolean;
  accessToken: string;
  defaultChannelSlug: string;
  autoUpload: boolean; // Automatically upload downloads to Are.na
  includeMetadata: boolean; // Include Instagram metadata in description
}

// Default Are.na settings
export const DEFAULT_ARENA_SETTINGS: ArenaSettings = {
  enabled: false,
  accessToken: '',
  defaultChannelSlug: '',
  autoUpload: false,
  includeMetadata: true,
};

// Are.na upload queue item
export interface ArenaUploadQueueItem {
  id: string;
  sourceUrl: string;
  channelSlug: string;
  title?: string;
  description?: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  createdAt: number;
  completedAt?: number;
  blockId?: number;
}

// Are.na connection status
export interface ArenaConnectionStatus {
  connected: boolean;
  username?: string;
  userId?: number;
  channelCount?: number;
  lastChecked?: number;
  error?: string;
}
