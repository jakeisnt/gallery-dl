/**
 * Background Service Worker
 */

import type { ExtensionMessage, ImageUrlResponse, ChannelsResponse, ConnectResponse } from '../types/messages';
import { arenaClient } from '../arena';
import { getArenaSettings } from '../types/storage';

// Initialize Are.na client on startup
getArenaSettings().then(settings => {
  if (settings.accessToken) {
    arenaClient.initialize(settings.accessToken);
  }
});

// Re-initialize when settings change
chrome.storage.onChanged.addListener((changes) => {
  if (changes.accessToken?.newValue) {
    arenaClient.initialize(changes.accessToken.newValue);
  }
});

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    handleMessage(message, sender.tab?.id).then(sendResponse);
    return true;
  }
);

async function handleMessage(
  message: ExtensionMessage,
  tabId?: number
): Promise<ImageUrlResponse | ChannelsResponse | ConnectResponse> {
  try {
    switch (message.type) {
      case 'GET_IMAGE_URL':
        return await getImageUrl(tabId);

      case 'GET_CHANNELS':
        return await getChannels();

      case 'SEARCH_CHANNELS':
        return await searchChannels(message.query);

      case 'CONNECT_IMAGE':
        return await connectImage(message.imageUrl, message.channelSlug);

      default:
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

async function getImageUrl(tabId?: number): Promise<ImageUrlResponse> {
  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Try multiple selectors for Instagram's changing DOM
        const selectors = [
          'article img[src*="instagram"]',
          'article img[src*="cdninstagram"]',
          'main article img',
          '[role="presentation"] img',
          'article video[poster]',
        ];

        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            if (element instanceof HTMLVideoElement) {
              return element.poster || null;
            }
            if (element instanceof HTMLImageElement) {
              return element.src || null;
            }
          }
        }
        return null;
      },
    });

    if (result?.result) {
      return { success: true, imageUrl: result.result };
    }
    return { success: false, error: 'No image found. Make sure you\'re on an Instagram post.' };
  } catch {
    return { success: false, error: 'Could not access page content. Try refreshing the page.' };
  }
}

async function getChannels(): Promise<ChannelsResponse> {
  if (!arenaClient.isConfigured()) {
    return { success: false, error: 'Are.na not configured. Add access token in settings.' };
  }

  const channels = await arenaClient.getChannels();
  return { success: true, channels };
}

async function searchChannels(query: string): Promise<ChannelsResponse> {
  if (!arenaClient.isConfigured()) {
    return { success: false, error: 'Are.na not configured. Add access token in settings.' };
  }

  const channels = await arenaClient.searchChannels(query);
  return { success: true, channels };
}

async function connectImage(imageUrl: string, channelSlug: string): Promise<ConnectResponse> {
  if (!arenaClient.isConfigured()) {
    return { success: false, error: 'Are.na not configured. Add access token in settings.' };
  }

  const block = await arenaClient.connectImage(imageUrl, channelSlug);
  return { success: true, blockId: block.id, channelSlug: block.slug };
}
