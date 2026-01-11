/**
 * Background Service Worker
 * Handles API requests, downloads, and message routing
 */

import type {
  ExtensionMessage,
  AuthStatusResponse,
  ExtractMediaResponse,
  DownloadResponse,
  DownloadProgressMessage,
} from '../types/messages';
import type { ExtractedMedia } from '../types/instagram';
import { getInstagramAuth, isLoggedIn } from '../utils/cookies';
import { createInstagramClient, InstagramClient } from '../api/instagram-client';
import { extractAllMedia, canExtract } from '../extractors';
import { DownloadManager } from '../download/manager';
import { getPreferences, preferencesToDownloadOptions } from '../types/storage';

// Singleton instances
let client: InstagramClient | null = null;
let downloadManager: DownloadManager | null = null;

/**
 * Initialize or get the Instagram client
 */
async function getClient(): Promise<InstagramClient> {
  if (!client) {
    const auth = await getInstagramAuth();
    client = await createInstagramClient(auth.csrfToken);
  }
  return client;
}

/**
 * Get or create download manager
 */
async function getDownloadManager(): Promise<DownloadManager> {
  if (!downloadManager) {
    const prefs = await getPreferences();
    downloadManager = new DownloadManager(preferencesToDownloadOptions(prefs));
  }
  return downloadManager;
}

/**
 * Handle messages from popup and content scripts
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    handleMessage(message, sender, sendResponse);
    return true; // Indicates async response
  }
);

/**
 * Route and handle incoming messages
 */
async function handleMessage(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'GET_AUTH_STATUS':
        await handleGetAuthStatus(sendResponse);
        break;

      case 'EXTRACT_MEDIA':
        await handleExtractMedia(message.url, sendResponse);
        break;

      case 'DOWNLOAD_MEDIA':
        await handleDownloadMedia(message.media, sendResponse);
        break;

      case 'DOWNLOAD_BATCH':
        await handleDownloadBatch(message.media, sender.tab?.id, sendResponse);
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Background message handler error:', error);
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle auth status check
 */
async function handleGetAuthStatus(
  sendResponse: (response: AuthStatusResponse) => void
): Promise<void> {
  try {
    const loggedIn = await isLoggedIn();

    if (loggedIn) {
      const auth = await getInstagramAuth();
      sendResponse({
        isLoggedIn: true,
        userId: auth.userId,
      });
    } else {
      sendResponse({ isLoggedIn: false });
    }
  } catch {
    sendResponse({ isLoggedIn: false });
  }
}

/**
 * Handle media extraction request
 */
async function handleExtractMedia(
  url: string,
  sendResponse: (response: ExtractMediaResponse) => void
): Promise<void> {
  if (!canExtract(url)) {
    sendResponse({
      success: false,
      error: 'URL is not a valid Instagram URL',
    });
    return;
  }

  try {
    const instagramClient = await getClient();
    const prefs = await getPreferences();

    const media = await extractAllMedia(url, instagramClient, {
      includeVideos: prefs.includeVideos,
      includeImages: prefs.includeImages,
      filenameTemplate: prefs.filenameTemplate,
    });

    sendResponse({
      success: true,
      media,
    });
  } catch (error) {
    // Reset client on auth errors to force re-auth
    if (
      error instanceof Error &&
      (error.message.includes('authentication') ||
        error.message.includes('login'))
    ) {
      client = null;
    }

    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle single media download
 */
async function handleDownloadMedia(
  media: ExtractedMedia,
  sendResponse: (response: DownloadResponse) => void
): Promise<void> {
  try {
    const manager = await getDownloadManager();
    const prefs = await getPreferences();

    const result = await manager.download(media, {
      directory: prefs.downloadDirectory,
      filenameTemplate: prefs.filenameTemplate,
    });

    sendResponse({
      success: result.success,
      downloadId: result.downloadId,
      error: result.error,
    });

    // Show notification if enabled
    if (prefs.showNotifications && result.success) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Download Complete',
        message: `Downloaded: ${result.filename}`,
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle batch download
 */
async function handleDownloadBatch(
  media: ExtractedMedia[],
  tabId: number | undefined,
  sendResponse: (response: DownloadResponse) => void
): Promise<void> {
  try {
    const manager = await getDownloadManager();
    const prefs = await getPreferences();

    const progress = await manager.downloadBatch(
      media,
      {
        directory: prefs.downloadDirectory,
        filenameTemplate: prefs.filenameTemplate,
        includeVideos: prefs.includeVideos,
        includeImages: prefs.includeImages,
      },
      (progressData) => {
        // Send progress updates to popup if open
        chrome.runtime.sendMessage({
          type: 'DOWNLOAD_PROGRESS',
          completed: progressData.completed,
          total: progressData.total,
          currentFile: progressData.currentFile,
        } as DownloadProgressMessage).catch(() => {
          // Popup might be closed, ignore
        });
      }
    );

    sendResponse({
      success: progress.errors.length === 0,
      error:
        progress.errors.length > 0
          ? `${progress.errors.length} download(s) failed`
          : undefined,
    });

    // Show notification if enabled
    if (prefs.showNotifications) {
      const successCount = progress.completed;
      const failCount = progress.errors.length;

      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'Batch Download Complete',
        message: failCount > 0
          ? `Downloaded ${successCount} files. ${failCount} failed.`
          : `Downloaded ${successCount} files.`,
      });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Handle extension install/update
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Instagram Downloader extension installed');
  } else if (details.reason === 'update') {
    console.log(`Instagram Downloader updated to version ${chrome.runtime.getManifest().version}`);
  }
});

/**
 * Clear client cache when cookies change
 */
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (
    changeInfo.cookie.domain.includes('instagram.com') &&
    changeInfo.cookie.name === 'sessionid'
  ) {
    client = null;
  }
});

console.log('Instagram Downloader background worker started');
