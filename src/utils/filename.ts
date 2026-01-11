/**
 * Filename generation and manipulation utilities
 */

import type { MediaMetadata } from '../types/instagram';

export interface FilenameTemplateData {
  username: string;
  shortcode: string;
  postId: string;
  num: number;
  extension: string;
  timestamp: number;
  type: string;
}

/**
 * Default filename template
 */
export const DEFAULT_TEMPLATE = '{username}_{shortcode}_{num}.{extension}';

/**
 * Format a filename using a template and metadata
 */
export function formatFilename(
  template: string,
  data: FilenameTemplateData
): string {
  return template
    .replace('{username}', sanitizeFilename(data.username || 'unknown'))
    .replace('{shortcode}', data.shortcode || 'unknown')
    .replace('{postId}', data.postId || 'unknown')
    .replace('{num}', String(data.num || 1))
    .replace('{extension}', data.extension || 'jpg')
    .replace('{timestamp}', String(data.timestamp || Date.now()))
    .replace('{type}', data.type || 'media')
    .replace('{date}', formatDate(data.timestamp));
}

/**
 * Create filename template data from media metadata
 */
export function createTemplateData(
  metadata: MediaMetadata,
  extension: string,
  type: 'image' | 'video'
): FilenameTemplateData {
  return {
    username: metadata.username,
    shortcode: metadata.shortcode,
    postId: metadata.postId,
    num: metadata.carouselIndex || 1,
    extension,
    timestamp: metadata.timestamp,
    type,
  };
}

/**
 * Sanitize a string for use in filenames
 * Removes or replaces characters that are invalid in filenames
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 200); // Limit length
}

/**
 * Extract extension from URL
 */
export function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match?.[1]?.toLowerCase() || 'jpg';
  } catch {
    return 'jpg';
  }
}

/**
 * Format a Unix timestamp as YYYYMMDD
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Extract filename from URL (without extension)
 */
export function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'instagram_media';
    return filename.replace(/\.[^.]+$/, '');
  } catch {
    return 'instagram_media';
  }
}
