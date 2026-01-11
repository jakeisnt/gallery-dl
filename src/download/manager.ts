/**
 * Download Manager
 * Handles downloading media files using Chrome's Downloads API
 */

import type { ExtractedMedia } from '../types/instagram';
import type { DownloadOptions } from '../types/messages';
import {
  formatFilename,
  createTemplateData,
  DEFAULT_TEMPLATE,
} from '../utils/filename';
import { sleep } from '../utils/delay';
import { addDownloadToHistory } from '../types/storage';

export interface DownloadResult {
  success: boolean;
  downloadId?: number;
  filename?: string;
  error?: string;
}

export interface BatchDownloadProgress {
  completed: number;
  total: number;
  currentFile?: string;
  errors: Array<{ filename: string; error: string }>;
}

export type ProgressCallback = (progress: BatchDownloadProgress) => void;

/**
 * Download Manager class
 * Manages downloading media files with rate limiting and progress tracking
 */
export class DownloadManager {
  private rateLimit = 1000; // ms between downloads

  constructor(private options: DownloadOptions = {}) {}

  /**
   * Download a single media file
   */
  async download(
    media: ExtractedMedia,
    options: DownloadOptions = {}
  ): Promise<DownloadResult> {
    const opts = { ...this.options, ...options };
    const filename = this.getFilename(media, opts);
    const fullPath = opts.directory
      ? `${opts.directory}/${filename}`
      : filename;

    try {
      const downloadId = await chrome.downloads.download({
        url: media.url,
        filename: fullPath,
        saveAs: false,
        conflictAction: opts.skipExisting ? 'uniquify' : 'overwrite',
      });

      // Wait for download to complete
      await this.waitForDownload(downloadId);

      // Record in history
      await addDownloadToHistory({
        id: String(downloadId),
        url: media.url,
        filename: fullPath,
        timestamp: Date.now(),
        success: true,
      });

      return {
        success: true,
        downloadId,
        filename: fullPath,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Record failed download
      await addDownloadToHistory({
        id: `failed-${Date.now()}`,
        url: media.url,
        filename: fullPath,
        timestamp: Date.now(),
        success: false,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Download multiple media files in batch
   */
  async downloadBatch(
    mediaItems: ExtractedMedia[],
    options: DownloadOptions = {},
    onProgress?: ProgressCallback
  ): Promise<BatchDownloadProgress> {
    const opts = { ...this.options, ...options };
    const total = mediaItems.length;
    const progress: BatchDownloadProgress = {
      completed: 0,
      total,
      errors: [],
    };

    // Filter by type if specified
    let items = mediaItems;
    if (opts.includeVideos === false) {
      items = items.filter((m) => m.type !== 'video');
    }
    if (opts.includeImages === false) {
      items = items.filter((m) => m.type !== 'image');
    }

    progress.total = items.length;

    for (const media of items) {
      progress.currentFile = this.getFilename(media, opts);
      onProgress?.(progress);

      const result = await this.download(media, opts);

      if (result.success) {
        progress.completed++;
      } else {
        progress.errors.push({
          filename: progress.currentFile,
          error: result.error || 'Unknown error',
        });
      }

      onProgress?.(progress);

      // Rate limiting between downloads
      if (progress.completed < items.length) {
        await sleep(this.rateLimit);
      }
    }

    return progress;
  }

  /**
   * Wait for a download to complete
   */
  private waitForDownload(downloadId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const listener = (delta: chrome.downloads.DownloadDelta) => {
        if (delta.id !== downloadId) return;

        if (delta.state?.current === 'complete') {
          chrome.downloads.onChanged.removeListener(listener);
          resolve();
        } else if (delta.error?.current) {
          chrome.downloads.onChanged.removeListener(listener);
          reject(new Error(delta.error.current));
        } else if (delta.state?.current === 'interrupted') {
          chrome.downloads.onChanged.removeListener(listener);
          reject(new Error('Download interrupted'));
        }
      };

      chrome.downloads.onChanged.addListener(listener);

      // Also check current state in case download finished immediately
      chrome.downloads.search({ id: downloadId }, (downloads) => {
        if (downloads.length > 0) {
          const download = downloads[0];
          if (download.state === 'complete') {
            chrome.downloads.onChanged.removeListener(listener);
            resolve();
          } else if (download.error) {
            chrome.downloads.onChanged.removeListener(listener);
            reject(new Error(download.error));
          }
        }
      });
    });
  }

  /**
   * Get filename for a media item
   */
  private getFilename(media: ExtractedMedia, options: DownloadOptions): string {
    const template = options.filenameTemplate || DEFAULT_TEMPLATE;
    const templateData = createTemplateData(
      media.metadata,
      media.extension,
      media.type
    );
    return formatFilename(template, templateData);
  }

  /**
   * Set rate limit between downloads
   */
  setRateLimit(ms: number): void {
    this.rateLimit = ms;
  }

  /**
   * Cancel all pending downloads
   */
  async cancelAll(): Promise<void> {
    const downloads = await chrome.downloads.search({
      state: 'in_progress',
    });

    for (const download of downloads) {
      await chrome.downloads.cancel(download.id);
    }
  }
}

/**
 * Create a download manager with default options
 */
export function createDownloadManager(
  options: DownloadOptions = {}
): DownloadManager {
  return new DownloadManager(options);
}
