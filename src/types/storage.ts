/**
 * Chrome storage types for extension settings and state
 */

import type { DownloadOptions } from './messages';
import type { ArenaSettings, ArenaUploadQueueItem } from './arena';
import { DEFAULT_ARENA_SETTINGS } from './arena';

// User preferences stored in chrome.storage.sync
export interface UserPreferences {
  // Download settings
  downloadDirectory: string;
  filenameTemplate: string;
  includeVideos: boolean;
  includeImages: boolean;
  skipExisting: boolean;

  // Rate limiting
  minDelayMs: number;
  maxDelayMs: number;

  // UI preferences
  showNotifications: boolean;
  autoClose: boolean;

  // Are.na integration
  arena: ArenaSettings;
}

// Default preferences
export const DEFAULT_PREFERENCES: UserPreferences = {
  downloadDirectory: 'Instagram',
  filenameTemplate: '{username}_{shortcode}_{num}.{extension}',
  includeVideos: true,
  includeImages: true,
  skipExisting: false,
  minDelayMs: 1000,
  maxDelayMs: 3000,
  showNotifications: true,
  autoClose: false,
  arena: DEFAULT_ARENA_SETTINGS,
};

// Download history entry
export interface DownloadHistoryEntry {
  id: string;
  url: string;
  filename: string;
  timestamp: number;
  success: boolean;
  error?: string;
}

// Download statistics
export interface DownloadStats {
  totalDownloads: number;
  successfulDownloads: number;
  failedDownloads: number;
  lastDownloadTime?: number;
}

// Local storage data (chrome.storage.local)
export interface LocalStorageData {
  downloadHistory: DownloadHistoryEntry[];
  downloadStats: DownloadStats;
  cachedUserData: Record<string, CachedUser>;
  wwwClaim: string;
  arenaUploadQueue: ArenaUploadQueueItem[];
}

// Cached user data
export interface CachedUser {
  id: string;
  username: string;
  fullName: string;
  cachedAt: number;
}

// Default local storage
export const DEFAULT_LOCAL_STORAGE: LocalStorageData = {
  downloadHistory: [],
  downloadStats: {
    totalDownloads: 0,
    successfulDownloads: 0,
    failedDownloads: 0,
  },
  cachedUserData: {},
  wwwClaim: '0',
  arenaUploadQueue: [],
};

// Helper functions for storage operations
export async function getPreferences(): Promise<UserPreferences> {
  const result = await chrome.storage.sync.get(DEFAULT_PREFERENCES);
  return result as UserPreferences;
}

export async function setPreferences(
  prefs: Partial<UserPreferences>
): Promise<void> {
  await chrome.storage.sync.set(prefs);
}

export async function getLocalStorage(): Promise<LocalStorageData> {
  const result = await chrome.storage.local.get(DEFAULT_LOCAL_STORAGE);
  return result as LocalStorageData;
}

export async function setLocalStorage(
  data: Partial<LocalStorageData>
): Promise<void> {
  await chrome.storage.local.set(data);
}

export async function addDownloadToHistory(
  entry: DownloadHistoryEntry
): Promise<void> {
  const storage = await getLocalStorage();
  storage.downloadHistory.unshift(entry);

  // Keep only last 1000 entries
  if (storage.downloadHistory.length > 1000) {
    storage.downloadHistory = storage.downloadHistory.slice(0, 1000);
  }

  // Update stats
  storage.downloadStats.totalDownloads++;
  if (entry.success) {
    storage.downloadStats.successfulDownloads++;
  } else {
    storage.downloadStats.failedDownloads++;
  }
  storage.downloadStats.lastDownloadTime = entry.timestamp;

  await setLocalStorage(storage);
}

export function preferencesToDownloadOptions(
  prefs: UserPreferences
): DownloadOptions {
  return {
    directory: prefs.downloadDirectory,
    filenameTemplate: prefs.filenameTemplate,
    skipExisting: prefs.skipExisting,
    includeVideos: prefs.includeVideos,
    includeImages: prefs.includeImages,
  };
}
