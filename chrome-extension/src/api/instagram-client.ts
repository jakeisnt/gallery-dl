/**
 * Instagram API Client
 * Based on gallery-dl's Instagram REST API implementation
 */

import type {
  InstagramUser,
  InstagramPost,
  FeedResponse,
  ReelsMediaResponse,
  HighlightsTrayResponse,
  SavedPostsResponse,
  MediaInfoResponse,
  WebProfileInfoResponse,
  UserInfoResponse,
  StoryReel,
  PaginatedResponse,
} from '../types/instagram';
import { shortcodeToId } from '../utils/shortcode';
import { randomSleep } from '../utils/delay';
import { parseApiError, InstagramApiError } from './errors';
import { getLocalStorage, setLocalStorage } from '../types/storage';

export interface InstagramClientConfig {
  csrfToken: string;
  sessionId?: string;
}

export class InstagramClient {
  private baseUrl = 'https://www.instagram.com/api';
  private appId = '936619743392459';
  private asbdId = '129477';
  private wwwClaim = '0';

  constructor(private config: InstagramClientConfig) {}

  /**
   * Initialize client and restore cached state
   */
  async init(): Promise<void> {
    const storage = await getLocalStorage();
    if (storage.wwwClaim) {
      this.wwwClaim = storage.wwwClaim;
    }
  }

  /**
   * Make an authenticated request to Instagram's API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers: HeadersInit = {
      Accept: '*/*',
      'X-CSRFToken': this.config.csrfToken,
      'X-IG-App-ID': this.appId,
      'X-ASBD-ID': this.asbdId,
      'X-IG-WWW-Claim': this.wwwClaim,
      'X-Requested-With': 'XMLHttpRequest',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Update www-claim header if present
    const newClaim = response.headers.get('x-ig-set-www-claim');
    if (newClaim) {
      this.wwwClaim = newClaim;
      // Persist to storage
      await setLocalStorage({ wwwClaim: newClaim });
    }

    if (!response.ok) {
      const responseText = await response.text();

      // Check for redirect to login/challenge page
      if (response.redirected) {
        if (response.url.includes('/accounts/login/')) {
          throw parseApiError(401, 'Redirected to login page');
        }
        if (response.url.includes('/challenge/')) {
          throw parseApiError(403, 'Redirected to challenge page');
        }
      }

      throw parseApiError(response.status, responseText);
    }

    return response.json();
  }

  /**
   * Make a POST request with JSON body
   */
  private async postRequest<T>(
    endpoint: string,
    data: Record<string, unknown>
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ).toString(),
    });
  }

  // ============================================
  // User endpoints
  // ============================================

  /**
   * Get user info by username
   */
  async getUserByName(username: string): Promise<InstagramUser> {
    const data = await this.request<WebProfileInfoResponse>(
      `/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`
    );
    return data.data.user;
  }

  /**
   * Get user info by ID
   */
  async getUserById(userId: string): Promise<InstagramUser> {
    const data = await this.request<UserInfoResponse>(
      `/v1/users/${userId}/info/`
    );
    return data.user;
  }

  // ============================================
  // Post/Media endpoints
  // ============================================

  /**
   * Get media/post info by shortcode
   */
  async getMediaByShortcode(shortcode: string): Promise<InstagramPost> {
    const mediaId = shortcodeToId(shortcode);
    const data = await this.request<MediaInfoResponse>(
      `/v1/media/${mediaId}/info/`
    );

    if (!data.items || data.items.length === 0) {
      throw new InstagramApiError(404, '', 'Media not found');
    }

    return data.items[0];
  }

  /**
   * Get media/post info by media ID
   */
  async getMediaById(mediaId: string): Promise<InstagramPost> {
    const data = await this.request<MediaInfoResponse>(
      `/v1/media/${mediaId}/info/`
    );

    if (!data.items || data.items.length === 0) {
      throw new InstagramApiError(404, '', 'Media not found');
    }

    return data.items[0];
  }

  // ============================================
  // Feed endpoints
  // ============================================

  /**
   * Get user's feed/posts
   */
  async getUserFeed(userId: string, maxId?: string): Promise<FeedResponse> {
    const params = new URLSearchParams({ count: '30' });
    if (maxId) {
      params.set('max_id', maxId);
    }

    return this.request<FeedResponse>(
      `/v1/feed/user/${userId}/?${params.toString()}`
    );
  }

  /**
   * Get user's reels/clips
   */
  async getUserClips(
    userId: string,
    maxId?: string
  ): Promise<FeedResponse> {
    const data: Record<string, unknown> = {
      target_user_id: userId,
      page_size: 30,
      include_feed_video: true,
    };

    if (maxId) {
      data.max_id = maxId;
    }

    return this.postRequest<FeedResponse>('/v1/clips/user/', data);
  }

  /**
   * Get posts the user is tagged in
   */
  async getUserTagged(userId: string, maxId?: string): Promise<FeedResponse> {
    const params = new URLSearchParams({ count: '30' });
    if (maxId) {
      params.set('max_id', maxId);
    }

    return this.request<FeedResponse>(
      `/v1/usertags/${userId}/feed/?${params.toString()}`
    );
  }

  // ============================================
  // Stories endpoints
  // ============================================

  /**
   * Get stories/reels media for given user IDs
   */
  async getReelsMedia(reelIds: string[]): Promise<ReelsMediaResponse> {
    const params = new URLSearchParams();
    reelIds.forEach(id => params.append('reel_ids', id));

    return this.request<ReelsMediaResponse>(
      `/v1/feed/reels_media/?${params.toString()}`
    );
  }

  /**
   * Get user's story highlights tray
   */
  async getHighlightsTray(userId: string): Promise<HighlightsTrayResponse> {
    return this.request<HighlightsTrayResponse>(
      `/v1/highlights/${userId}/highlights_tray/`
    );
  }

  /**
   * Get highlight reel items
   */
  async getHighlightItems(highlightId: string): Promise<StoryReel> {
    const data = await this.getReelsMedia([highlightId]);
    const reel = data.reels?.[highlightId] || data.reels_media?.[0];

    if (!reel) {
      throw new InstagramApiError(404, '', 'Highlight not found');
    }

    return reel;
  }

  // ============================================
  // Saved posts endpoints
  // ============================================

  /**
   * Get saved posts
   */
  async getSavedPosts(maxId?: string): Promise<SavedPostsResponse> {
    const params = new URLSearchParams({ count: '50' });
    if (maxId) {
      params.set('max_id', maxId);
    }

    return this.request<SavedPostsResponse>(
      `/v1/feed/saved/posts/?${params.toString()}`
    );
  }

  /**
   * Get saved collection posts
   */
  async getSavedCollection(
    collectionId: string,
    maxId?: string
  ): Promise<SavedPostsResponse> {
    const params = new URLSearchParams({ count: '50' });
    if (maxId) {
      params.set('max_id', maxId);
    }

    return this.request<SavedPostsResponse>(
      `/v1/feed/collection/${collectionId}/posts/?${params.toString()}`
    );
  }

  // ============================================
  // Hashtag endpoints
  // ============================================

  /**
   * Get posts by hashtag
   */
  async getTagPosts(
    tag: string,
    maxId?: string
  ): Promise<FeedResponse> {
    const data: Record<string, unknown> = {
      include_persistent: 0,
      tab: 'recent',
    };

    if (maxId) {
      data.next_max_id = maxId;
    }

    return this.postRequest<FeedResponse>(
      `/v1/tags/${encodeURIComponent(tag)}/sections/`,
      data
    );
  }

  // ============================================
  // Pagination helpers
  // ============================================

  /**
   * Paginate through feed-style endpoints
   */
  async *paginateFeed(
    fetchFn: (maxId?: string) => Promise<FeedResponse>,
    options: {
      maxItems?: number;
      delayMs?: { min: number; max: number };
    } = {}
  ): AsyncGenerator<InstagramPost> {
    const { maxItems, delayMs = { min: 3000, max: 6000 } } = options;
    let maxId: string | undefined;
    let count = 0;

    while (true) {
      const response = await fetchFn(maxId);

      for (const item of response.items) {
        yield item;
        count++;

        if (maxItems && count >= maxItems) {
          return;
        }
      }

      if (!response.more_available || !response.next_max_id) {
        break;
      }

      maxId = response.next_max_id;

      // Rate limiting delay
      await randomSleep(delayMs.min, delayMs.max);
    }
  }

  /**
   * Paginate through saved posts
   */
  async *paginateSaved(
    fetchFn: (maxId?: string) => Promise<SavedPostsResponse>,
    options: {
      maxItems?: number;
      delayMs?: { min: number; max: number };
    } = {}
  ): AsyncGenerator<InstagramPost> {
    const { maxItems, delayMs = { min: 3000, max: 6000 } } = options;
    let maxId: string | undefined;
    let count = 0;

    while (true) {
      const response = await fetchFn(maxId);

      for (const item of response.items) {
        yield item.media;
        count++;

        if (maxItems && count >= maxItems) {
          return;
        }
      }

      if (!response.more_available || !response.next_max_id) {
        break;
      }

      maxId = response.next_max_id;

      // Rate limiting delay
      await randomSleep(delayMs.min, delayMs.max);
    }
  }
}

/**
 * Create an Instagram client from stored auth
 */
export async function createInstagramClient(
  csrfToken: string
): Promise<InstagramClient> {
  const client = new InstagramClient({ csrfToken });
  await client.init();
  return client;
}
