/**
 * Extractor Registry
 * Central registry for all Instagram extractors
 */

import type { InstagramClient } from '../api/instagram-client';
import type { ExtractedMedia } from '../types/instagram';
import {
  InstagramExtractor,
  ExtractorOptions,
  DEFAULT_EXTRACTOR_OPTIONS,
} from './base';
import { PostExtractor } from './post';
import { UserExtractor, UserReelsExtractor, UserTaggedExtractor } from './user';
import { StoriesExtractor, HighlightsExtractor } from './stories';
import { SavedExtractor, SavedCollectionExtractor } from './saved';

// Re-export base classes and types
export * from './base';
export * from './post';
export * from './user';
export * from './stories';
export * from './saved';

/**
 * All available extractor classes in priority order
 * More specific patterns should come before general ones
 */
const EXTRACTOR_CLASSES = [
  PostExtractor,
  StoriesExtractor,
  HighlightsExtractor,
  UserReelsExtractor,
  UserTaggedExtractor,
  SavedCollectionExtractor,
  SavedExtractor,
  UserExtractor, // Most general, should be last
];

/**
 * Find the appropriate extractor for a URL
 */
export function findExtractor(
  url: string,
  client: InstagramClient,
  options: ExtractorOptions = {}
): InstagramExtractor | null {
  const opts = { ...DEFAULT_EXTRACTOR_OPTIONS, ...options };

  for (const ExtractorClass of EXTRACTOR_CLASSES) {
    const extractor = new ExtractorClass(client, opts);
    if (extractor.match(url)) {
      return extractor;
    }
  }

  return null;
}

/**
 * Extract media from a URL using the appropriate extractor
 */
export async function* extractMedia(
  url: string,
  client: InstagramClient,
  options: ExtractorOptions = {}
): AsyncGenerator<ExtractedMedia> {
  const extractor = findExtractor(url, client, options);

  if (!extractor) {
    throw new Error(`No extractor found for URL: ${url}`);
  }

  yield* extractor.extract(url);
}

/**
 * Extract all media from a URL into an array
 */
export async function extractAllMedia(
  url: string,
  client: InstagramClient,
  options: ExtractorOptions = {}
): Promise<ExtractedMedia[]> {
  const media: ExtractedMedia[] = [];

  for await (const item of extractMedia(url, client, options)) {
    media.push(item);
  }

  return media;
}

/**
 * Check if a URL can be handled by any extractor
 */
export function canExtract(url: string): boolean {
  // Check patterns without needing a client
  const patterns = [
    /instagram\.com\/p\//,
    /instagram\.com\/reel\//,
    /instagram\.com\/reels?\//,
    /instagram\.com\/tv\//,
    /instagram\.com\/stories\//,
    /instagram\.com\/[A-Za-z0-9_.]+\/saved/,
    /instagram\.com\/[A-Za-z0-9_.]+\/reels\/?$/,
    /instagram\.com\/[A-Za-z0-9_.]+\/tagged\/?$/,
    /instagram\.com\/[A-Za-z0-9_.]+\/highlights\/?$/,
    /instagram\.com\/[A-Za-z0-9_.]+\/?$/,
  ];

  // Must be an Instagram URL
  if (!url.includes('instagram.com')) {
    return false;
  }

  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Get the type of content from a URL
 */
export function getContentType(
  url: string
): 'post' | 'reel' | 'story' | 'highlight' | 'user' | 'saved' | 'unknown' {
  if (/instagram\.com\/p\//.test(url)) {
    return 'post';
  }
  if (/instagram\.com\/reel\//.test(url) || /instagram\.com\/reels?\//.test(url)) {
    return 'reel';
  }
  if (/instagram\.com\/tv\//.test(url)) {
    return 'post'; // IGTV is similar to posts
  }
  if (/instagram\.com\/stories\/highlights\//.test(url)) {
    return 'highlight';
  }
  if (/instagram\.com\/stories\//.test(url)) {
    return 'story';
  }
  if (/instagram\.com\/[A-Za-z0-9_.]+\/saved/.test(url)) {
    return 'saved';
  }
  if (/instagram\.com\/[A-Za-z0-9_.]+\/?$/.test(url)) {
    return 'user';
  }
  return 'unknown';
}
