/**
 * Cookie management utilities for Instagram authentication
 */

export interface InstagramAuth {
  sessionId: string;
  csrfToken: string;
  userId?: string;
}

/**
 * Get all Instagram cookies from the browser
 */
export async function getInstagramCookies(): Promise<chrome.cookies.Cookie[]> {
  return chrome.cookies.getAll({ domain: '.instagram.com' });
}

/**
 * Extract authentication tokens from Instagram cookies
 */
export async function getInstagramAuth(): Promise<InstagramAuth> {
  const cookies = await getInstagramCookies();

  const sessionId = cookies.find(c => c.name === 'sessionid')?.value;
  const csrfToken = cookies.find(c => c.name === 'csrftoken')?.value;
  const userId = cookies.find(c => c.name === 'ds_user_id')?.value;

  if (!sessionId) {
    throw new AuthenticationError('Not logged into Instagram. Please log in first.');
  }

  // Generate CSRF token if not present (Instagram will accept a new random one)
  const token = csrfToken || generateCsrfToken();

  return {
    sessionId,
    csrfToken: token,
    userId,
  };
}

/**
 * Check if user is currently logged into Instagram
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    const cookies = await getInstagramCookies();
    return cookies.some(c => c.name === 'sessionid' && c.value);
  } catch {
    return false;
  }
}

/**
 * Generate a random CSRF token (16 bytes hex string)
 * Matches gallery-dl's generate_token implementation
 */
export function generateCsrfToken(size = 16): string {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Update CSRF token cookie
 */
export async function updateCsrfToken(token: string): Promise<void> {
  await chrome.cookies.set({
    url: 'https://www.instagram.com',
    domain: '.instagram.com',
    name: 'csrftoken',
    value: token,
    path: '/',
    secure: true,
    sameSite: 'lax',
  });
}

/**
 * Authentication error class
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Build a cookie header string from Instagram cookies
 * This can be used for authenticated fetch requests
 */
export async function buildCookieHeader(): Promise<string> {
  const cookies = await getInstagramCookies();
  return cookies.map(c => `${c.name}=${c.value}`).join('; ');
}

/**
 * Get specific Instagram cookie value by name
 */
export async function getInstagramCookie(name: string): Promise<string | undefined> {
  const cookies = await getInstagramCookies();
  return cookies.find(c => c.name === name)?.value;
}

/**
 * Get all relevant Instagram auth cookies as an object
 */
export async function getInstagramCookiesMap(): Promise<Record<string, string>> {
  const cookies = await getInstagramCookies();
  const map: Record<string, string> = {};
  for (const cookie of cookies) {
    map[cookie.name] = cookie.value;
  }
  return map;
}
