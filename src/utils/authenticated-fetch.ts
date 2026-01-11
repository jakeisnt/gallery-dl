/**
 * Authenticated Fetch Utility
 * Fetches resources with Instagram session cookies included
 */

import { buildCookieHeader, getInstagramAuth } from './cookies';

/**
 * Fetch a resource with Instagram authentication cookies
 * This is necessary for downloading media from Instagram's CDN
 * which requires session cookies for authenticated content
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const cookieHeader = await buildCookieHeader();
  const auth = await getInstagramAuth();

  const headers: HeadersInit = {
    'Cookie': cookieHeader,
    'X-CSRFToken': auth.csrfToken,
    // Mimic browser request headers
    'Sec-Fetch-Dest': 'image',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    ...options.headers,
  };

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}

/**
 * Fetch media and return as a Blob URL
 * This allows downloading authenticated content via chrome.downloads API
 */
export async function fetchMediaAsBlob(url: string): Promise<{
  blobUrl: string;
  mimeType: string;
  size: number;
}> {
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status} ${response.statusText}`);
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  return {
    blobUrl,
    mimeType: blob.type,
    size: blob.size,
  };
}

/**
 * Revoke a blob URL to free up memory
 */
export function revokeBlobUrl(blobUrl: string): void {
  URL.revokeObjectURL(blobUrl);
}

/**
 * Check if a URL is an Instagram CDN URL that may require authentication
 */
export function isInstagramCdnUrl(url: string): boolean {
  return (
    url.includes('cdninstagram.com') ||
    url.includes('fbcdn.net') ||
    url.includes('instagram.com')
  );
}
