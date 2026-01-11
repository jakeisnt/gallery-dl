/**
 * React hook for Instagram extension functionality
 */

import { useState, useEffect, useCallback } from 'react';
import type { ExtractedMedia } from '../../types/instagram';
import type {
  AuthStatusResponse,
  ExtractMediaResponse,
  DownloadResponse,
  DownloadProgressMessage,
} from '../../types/messages';

export interface InstagramState {
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  currentUrl: string | null;
  media: ExtractedMedia[];
  downloadProgress: {
    isDownloading: boolean;
    completed: number;
    total: number;
    currentFile?: string;
  };
}

export interface InstagramActions {
  checkAuthStatus: () => Promise<void>;
  extractMedia: () => Promise<void>;
  downloadAll: () => Promise<void>;
  downloadSingle: (media: ExtractedMedia) => Promise<void>;
  clearError: () => void;
}

/**
 * Hook for Instagram extension state and actions
 */
export function useInstagram(): [InstagramState, InstagramActions] {
  const [state, setState] = useState<InstagramState>({
    isLoggedIn: false,
    isLoading: true,
    error: null,
    currentUrl: null,
    media: [],
    downloadProgress: {
      isDownloading: false,
      completed: 0,
      total: 0,
    },
  });

  /**
   * Check authentication status
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_AUTH_STATUS',
      });
      const authResponse = response as AuthStatusResponse;

      setState((prev) => ({
        ...prev,
        isLoggedIn: authResponse.isLoggedIn,
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoggedIn: false,
        isLoading: false,
        error: 'Failed to check login status',
      }));
    }
  }, []);

  /**
   * Get current tab URL
   */
  const getCurrentUrl = useCallback(async (): Promise<string | null> => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      return tab?.url || null;
    } catch {
      return null;
    }
  }, []);

  /**
   * Extract media from current page
   */
  const extractMedia = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null, media: [] }));

    try {
      const url = await getCurrentUrl();

      if (!url) {
        throw new Error('Could not get current tab URL');
      }

      if (!url.includes('instagram.com')) {
        throw new Error('Not an Instagram page');
      }

      setState((prev) => ({ ...prev, currentUrl: url }));

      const response = await chrome.runtime.sendMessage({
        type: 'EXTRACT_MEDIA',
        url,
      });

      const extractResponse = response as ExtractMediaResponse;

      if (!extractResponse.success) {
        throw new Error(extractResponse.error || 'Failed to extract media');
      }

      setState((prev) => ({
        ...prev,
        media: extractResponse.media || [],
        isLoading: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [getCurrentUrl]);

  /**
   * Download all extracted media
   */
  const downloadAll = useCallback(async () => {
    if (state.media.length === 0) return;

    setState((prev) => ({
      ...prev,
      downloadProgress: {
        isDownloading: true,
        completed: 0,
        total: state.media.length,
      },
    }));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_BATCH',
        media: state.media,
      });

      const downloadResponse = response as DownloadResponse;

      if (!downloadResponse.success) {
        throw new Error(downloadResponse.error || 'Download failed');
      }

      setState((prev) => ({
        ...prev,
        downloadProgress: {
          isDownloading: false,
          completed: state.media.length,
          total: state.media.length,
        },
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        downloadProgress: {
          isDownloading: false,
          completed: 0,
          total: 0,
        },
      }));
    }
  }, [state.media]);

  /**
   * Download a single media item
   */
  const downloadSingle = useCallback(async (media: ExtractedMedia) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DOWNLOAD_MEDIA',
        media,
      });

      const downloadResponse = response as DownloadResponse;

      if (!downloadResponse.success) {
        throw new Error(downloadResponse.error || 'Download failed');
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Listen for download progress updates
   */
  useEffect(() => {
    const listener = (message: unknown) => {
      const msg = message as DownloadProgressMessage;
      if (msg.type === 'DOWNLOAD_PROGRESS') {
        setState((prev) => ({
          ...prev,
          downloadProgress: {
            isDownloading: msg.completed < msg.total,
            completed: msg.completed,
            total: msg.total,
            currentFile: msg.currentFile,
          },
        }));
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  return [
    state,
    {
      checkAuthStatus,
      extractMedia,
      downloadAll,
      downloadSingle,
      clearError,
    },
  ];
}
