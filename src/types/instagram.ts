/**
 * Instagram data types and interfaces
 * Based on Instagram's REST API response structures
 */

// User types
export interface InstagramUser {
  pk: string;
  username: string;
  full_name: string;
  is_private: boolean;
  profile_pic_url: string;
  profile_pic_url_hd?: string;
  biography?: string;
  external_url?: string;
  follower_count?: number;
  following_count?: number;
  media_count?: number;
  is_verified?: boolean;
}

// Image candidate from image_versions2
export interface ImageCandidate {
  url: string;
  width: number;
  height: number;
}

// Video version
export interface VideoVersion {
  url: string;
  width: number;
  height: number;
  type?: number;
}

// Caption
export interface Caption {
  text: string;
  created_at?: number;
  user?: InstagramUser;
}

// Location
export interface Location {
  pk: string;
  name: string;
  slug?: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
}

// Tagged user in media
export interface TaggedUser {
  user: {
    pk: string;
    username: string;
    full_name: string;
  };
  position?: [number, number];
}

// Base media item (image or video in carousel or standalone)
export interface MediaItem {
  pk: string;
  id: string;
  code?: string;
  media_type: number; // 1 = image, 2 = video, 8 = carousel
  original_width?: number;
  original_height?: number;
  image_versions2?: {
    candidates: ImageCandidate[];
  };
  video_versions?: VideoVersion[];
  video_duration?: number;
  has_audio?: boolean;
  usertags?: {
    in: TaggedUser[];
  };
}

// Full post/media object
export interface InstagramPost extends MediaItem {
  taken_at: number;
  user: InstagramUser;
  caption?: Caption;
  like_count?: number;
  has_liked?: boolean;
  comment_count?: number;
  location?: Location;
  carousel_media?: MediaItem[];
  carousel_media_count?: number;
  product_type?: string; // 'feed', 'clips', 'igtv'
  video_dash_manifest?: string;
}

// Story item
export interface StoryItem extends MediaItem {
  taken_at: number;
  expiring_at?: number;
  user: InstagramUser;
  story_cta?: Array<{
    links: Array<{ webUri: string }>;
  }>;
}

// Story reel
export interface StoryReel {
  id: string;
  user: InstagramUser;
  items: StoryItem[];
  expiring_at?: number;
  seen?: number;
}

// Highlight
export interface Highlight {
  id: string;
  title: string;
  cover_media: {
    cropped_image_version?: {
      url: string;
    };
  };
  items?: StoryItem[];
}

// Extracted media (our normalized output format)
export interface ExtractedMedia {
  url: string;
  type: 'image' | 'video';
  filename: string;
  extension: string;
  metadata: MediaMetadata;
}

export interface MediaMetadata {
  postId: string;
  shortcode: string;
  username: string;
  timestamp: number;
  caption?: string;
  width: number;
  height: number;
  isCarousel: boolean;
  carouselIndex?: number;
  mediaType?: 'post' | 'story' | 'reel' | 'highlight';
  likes?: number;
  comments?: number;
}

// API Response types
export interface WebProfileInfoResponse {
  data: {
    user: InstagramUser;
  };
  status: string;
}

export interface UserInfoResponse {
  user: InstagramUser;
  status: string;
}

export interface MediaInfoResponse {
  items: InstagramPost[];
  num_results: number;
  status: string;
}

export interface FeedResponse {
  items: InstagramPost[];
  num_results: number;
  more_available: boolean;
  next_max_id?: string;
  status: string;
}

export interface ReelsMediaResponse {
  reels: Record<string, StoryReel>;
  reels_media: StoryReel[];
  status: string;
}

export interface HighlightsTrayResponse {
  tray: Highlight[];
  status: string;
}

export interface SavedPostsResponse {
  items: Array<{ media: InstagramPost }>;
  more_available: boolean;
  next_max_id?: string;
  status: string;
}

// Generic paginated response
export interface PaginatedResponse<T> {
  items: T[];
  more_available: boolean;
  next_max_id?: string;
}

// GraphQL types (for fallback)
export interface GraphQLMedia {
  __typename: 'GraphImage' | 'GraphVideo' | 'GraphSidecar';
  id: string;
  shortcode: string;
  taken_at_timestamp: number;
  dimensions: {
    width: number;
    height: number;
  };
  display_url: string;
  video_url?: string;
  is_video: boolean;
  edge_media_to_caption?: {
    edges: Array<{ node: { text: string } }>;
  };
  edge_media_preview_like?: {
    count: number;
  };
  owner: {
    id: string;
    username: string;
    full_name?: string;
  };
  edge_sidecar_to_children?: {
    edges: Array<{ node: GraphQLMedia }>;
  };
  location?: {
    id: string;
    slug: string;
    name: string;
  };
}
