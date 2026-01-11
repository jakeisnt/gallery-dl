/**
 * Download Queue
 * Manages a queue of downloads with persistence and background processing
 */

import type { ExtractedMedia } from '../types/instagram';
import type { DownloadOptions } from '../types/messages';
import { DownloadManager, DownloadResult } from './manager';

export interface QueuedDownload {
  id: string;
  media: ExtractedMedia;
  options: DownloadOptions;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  addedAt: number;
  completedAt?: number;
  error?: string;
}

export interface QueueState {
  items: QueuedDownload[];
  isProcessing: boolean;
  currentIndex: number;
}

export type QueueEventType =
  | 'itemAdded'
  | 'itemStarted'
  | 'itemCompleted'
  | 'itemFailed'
  | 'queueCompleted'
  | 'queuePaused';

export type QueueEventListener = (
  event: QueueEventType,
  data: { item?: QueuedDownload; queue: QueueState }
) => void;

/**
 * Download Queue class
 * Manages queued downloads with event-based progress updates
 */
export class DownloadQueue {
  private queue: QueuedDownload[] = [];
  private isProcessing = false;
  private isPaused = false;
  private currentIndex = 0;
  private listeners: QueueEventListener[] = [];
  private manager: DownloadManager;

  constructor(options: DownloadOptions = {}) {
    this.manager = new DownloadManager(options);
  }

  /**
   * Add a media item to the queue
   */
  add(media: ExtractedMedia, options: DownloadOptions = {}): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const item: QueuedDownload = {
      id,
      media,
      options,
      status: 'pending',
      addedAt: Date.now(),
    };

    this.queue.push(item);
    this.emit('itemAdded', item);

    // Auto-start processing if not already running
    if (!this.isProcessing && !this.isPaused) {
      this.process();
    }

    return id;
  }

  /**
   * Add multiple media items to the queue
   */
  addBatch(
    mediaItems: ExtractedMedia[],
    options: DownloadOptions = {}
  ): string[] {
    const ids = mediaItems.map((media) => this.add(media, options));
    return ids;
  }

  /**
   * Start or resume processing the queue
   */
  async process(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;
    this.isPaused = false;

    while (this.currentIndex < this.queue.length && !this.isPaused) {
      const item = this.queue[this.currentIndex];

      if (item.status === 'pending') {
        item.status = 'downloading';
        this.emit('itemStarted', item);

        const result = await this.manager.download(item.media, item.options);

        if (result.success) {
          item.status = 'completed';
          item.completedAt = Date.now();
          this.emit('itemCompleted', item);
        } else {
          item.status = 'failed';
          item.error = result.error;
          item.completedAt = Date.now();
          this.emit('itemFailed', item);
        }
      }

      this.currentIndex++;
    }

    this.isProcessing = false;

    if (this.currentIndex >= this.queue.length) {
      this.emit('queueCompleted');
    } else {
      this.emit('queuePaused');
    }
  }

  /**
   * Pause queue processing
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume queue processing
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.process();
    }
  }

  /**
   * Clear all pending items from the queue
   */
  clear(): void {
    this.queue = this.queue.filter((item) =>
      ['downloading', 'completed', 'failed'].includes(item.status)
    );
    this.currentIndex = Math.min(this.currentIndex, this.queue.length);
  }

  /**
   * Remove a specific item from the queue
   */
  remove(id: string): boolean {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1 && this.queue[index].status === 'pending') {
      this.queue.splice(index, 1);
      if (index < this.currentIndex) {
        this.currentIndex--;
      }
      return true;
    }
    return false;
  }

  /**
   * Get current queue state
   */
  getState(): QueueState {
    return {
      items: [...this.queue],
      isProcessing: this.isProcessing,
      currentIndex: this.currentIndex,
    };
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  } {
    const stats = {
      total: this.queue.length,
      pending: 0,
      completed: 0,
      failed: 0,
    };

    for (const item of this.queue) {
      if (item.status === 'pending' || item.status === 'downloading') {
        stats.pending++;
      } else if (item.status === 'completed') {
        stats.completed++;
      } else if (item.status === 'failed') {
        stats.failed++;
      }
    }

    return stats;
  }

  /**
   * Add an event listener
   */
  on(listener: QueueEventListener): void {
    this.listeners.push(listener);
  }

  /**
   * Remove an event listener
   */
  off(listener: QueueEventListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit an event to all listeners
   */
  private emit(event: QueueEventType, item?: QueuedDownload): void {
    const data = { item, queue: this.getState() };
    for (const listener of this.listeners) {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Queue event listener error:', error);
      }
    }
  }
}

/**
 * Create a download queue with default options
 */
export function createDownloadQueue(
  options: DownloadOptions = {}
): DownloadQueue {
  return new DownloadQueue(options);
}
