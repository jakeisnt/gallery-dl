/**
 * Instagram shortcode/media ID conversion utilities
 * Based on gallery-dl's Instagram extractor implementation
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Convert a shortcode to a numeric media ID
 * Uses base64-like decoding with Instagram's custom alphabet
 */
export function shortcodeToId(shortcode: string): string {
  let id = BigInt(0);
  const base = BigInt(ALPHABET.length);

  for (const char of shortcode) {
    const index = ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid shortcode character: ${char}`);
    }
    id = id * base + BigInt(index);
  }

  return id.toString();
}

/**
 * Convert a numeric media ID to a shortcode
 * Uses base64-like encoding with Instagram's custom alphabet
 */
export function idToShortcode(id: string | bigint): string {
  let num = typeof id === 'string' ? BigInt(id) : id;

  if (num === 0n) {
    return ALPHABET[0];
  }

  let shortcode = '';
  const base = BigInt(ALPHABET.length);

  while (num > 0n) {
    shortcode = ALPHABET[Number(num % base)] + shortcode;
    num = num / base;
  }

  return shortcode;
}

/**
 * Extract the shortcode from an Instagram URL
 */
export function extractShortcode(url: string): string | null {
  const patterns = [
    /instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/,
    /instagram\.com\/stories\/[^/]+\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Extract username from an Instagram profile URL
 */
export function extractUsername(url: string): string | null {
  const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)\/?(?:\?|$)/);
  if (match) {
    const username = match[1];
    // Exclude reserved paths
    const reserved = ['p', 'reel', 'tv', 'explore', 'stories', 'reels', 'accounts', 'direct'];
    if (!reserved.includes(username.toLowerCase())) {
      return username;
    }
  }
  return null;
}
