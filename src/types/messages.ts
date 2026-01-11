/**
 * Chrome extension message types for communication
 * between popup, content script, and background worker
 */

import type { ExtractedMedia } from './instagram';

// Message types
export type MessageType =
  | 'GET_AUTH_STATUS'
  | 'EXTRACT_MEDIA'
  | 'DOWNLOAD_MEDIA'
  | 'DOWNLOAD_BATCH'
  | 'GET_CURRENT_URL'
  | 'GET_PAGE_MEDIA'
  | 'DOWNLOAD_PROGRESS'
  | 'EXTRACTION_COMPLETE'
  | 'ERROR';

// Base message interface
export interface BaseMessage {
  type: MessageType;
}

// Request messages (sent to background/content)
export interface GetAuthStatusMessage extends BaseMessage {
  type: 'GET_AUTH_STATUS';
}

export interface ExtractMediaMessage extends BaseMessage {
  type: 'EXTRACT_MEDIA';
  url: string;
}

export interface DownloadMediaMessage extends BaseMessage {
  type: 'DOWNLOAD_MEDIA';
  media: ExtractedMedia;
  options?: DownloadOptions;
}

export interface DownloadBatchMessage extends BaseMessage {
  type: 'DOWNLOAD_BATCH';
  media: ExtractedMedia[];
  options?: DownloadOptions;
}

export interface GetCurrentUrlMessage extends BaseMessage {
  type: 'GET_CURRENT_URL';
}

export interface GetPageMediaMessage extends BaseMessage {
  type: 'GET_PAGE_MEDIA';
}

// Response messages
export interface AuthStatusResponse {
  isLoggedIn: boolean;
  userId?: string;
  username?: string;
}

export interface ExtractMediaResponse {
  success: boolean;
  media?: ExtractedMedia[];
  error?: string;
}

export interface DownloadResponse {
  success: boolean;
  downloadId?: number;
  error?: string;
}

export interface DownloadProgressMessage extends BaseMessage {
  type: 'DOWNLOAD_PROGRESS';
  completed: number;
  total: number;
  currentFile?: string;
}

export interface ExtractionCompleteMessage extends BaseMessage {
  type: 'EXTRACTION_COMPLETE';
  media: ExtractedMedia[];
}

export interface ErrorMessage extends BaseMessage {
  type: 'ERROR';
  error: string;
  code?: string;
}

// Download options
export interface DownloadOptions {
  directory?: string;
  filenameTemplate?: string;
  skipExisting?: boolean;
  includeVideos?: boolean;
  includeImages?: boolean;
}

// Union type for all messages
export type ExtensionMessage =
  | GetAuthStatusMessage
  | ExtractMediaMessage
  | DownloadMediaMessage
  | DownloadBatchMessage
  | GetCurrentUrlMessage
  | GetPageMediaMessage
  | DownloadProgressMessage
  | ExtractionCompleteMessage
  | ErrorMessage;

// Message sender helper type
export type MessageSender = chrome.runtime.MessageSender;

// Response callback type
export type SendResponse<T = unknown> = (response: T) => void;
