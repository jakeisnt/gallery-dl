/**
 * Content Script
 * Runs in the context of Instagram pages
 */

import type { ExtensionMessage, ExtractMediaResponse } from '../types/messages';
import type { ExtractedMedia } from '../types/instagram';
import { DOMScraper } from './dom-scraper';
import { canExtract, getContentType } from '../extractors';

// Initialize DOM scraper
const scraper = new DOMScraper();

/**
 * Listen for messages from the background script or popup
 */
chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    handleMessage(message, sendResponse);
    return true; // Indicates async response
  }
);

/**
 * Handle incoming messages
 */
async function handleMessage(
  message: ExtensionMessage,
  sendResponse: (response: unknown) => void
): Promise<void> {
  try {
    switch (message.type) {
      case 'GET_CURRENT_URL':
        sendResponse({ url: window.location.href });
        break;

      case 'GET_PAGE_MEDIA':
        const media = scraper.extractFromDOM();
        sendResponse({
          success: true,
          media,
        } as ExtractMediaResponse);
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  } catch (error) {
    sendResponse({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Inject download buttons into Instagram's UI (optional enhancement)
 */
function injectDownloadButtons(): void {
  // Only inject on post pages
  if (!canExtract(window.location.href)) {
    return;
  }

  const contentType = getContentType(window.location.href);

  // Find article elements (posts)
  const articles = document.querySelectorAll('article');

  for (const article of articles) {
    // Check if we've already injected
    if (article.querySelector('.igdl-download-btn')) {
      continue;
    }

    // Find the action bar (likes, comments, share, save)
    const actionBar = article.querySelector('section');
    if (!actionBar) continue;

    // Create download button
    const button = createDownloadButton(article);
    if (button) {
      // Insert after the save button or at the end
      const saveButton = actionBar.querySelector('[aria-label*="Save"]');
      if (saveButton?.parentElement) {
        saveButton.parentElement.after(button);
      }
    }
  }
}

/**
 * Create a download button element
 */
function createDownloadButton(article: Element): HTMLElement | null {
  const container = document.createElement('div');
  container.className = 'igdl-download-btn';
  container.style.cssText = `
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px;
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s;
  `;

  container.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
      <polyline points="7 10 12 15 17 10"></polyline>
      <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
  `;

  container.addEventListener('mouseenter', () => {
    container.style.opacity = '1';
  });

  container.addEventListener('mouseleave', () => {
    container.style.opacity = '0.7';
  });

  container.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Send message to background script to download
    const media = scraper.extractFromDOM();
    if (media.length > 0) {
      chrome.runtime.sendMessage({
        type: 'DOWNLOAD_BATCH',
        media,
      });

      // Visual feedback
      container.style.color = '#00ff00';
      setTimeout(() => {
        container.style.color = '';
      }, 1000);
    }
  });

  return container;
}

/**
 * Watch for DOM changes to inject buttons on new content
 */
function observeDOM(): void {
  const observer = new MutationObserver((mutations) => {
    let shouldInject = false;

    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement && node.querySelector('article')) {
            shouldInject = true;
            break;
          }
        }
      }
      if (shouldInject) break;
    }

    if (shouldInject) {
      // Debounce injection
      setTimeout(injectDownloadButtons, 500);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/**
 * Initialize content script
 */
function init(): void {
  // Initial injection
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectDownloadButtons();
      observeDOM();
    });
  } else {
    injectDownloadButtons();
    observeDOM();
  }

  // Handle URL changes (Instagram is an SPA)
  let lastUrl = window.location.href;
  const urlObserver = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(injectDownloadButtons, 1000);
    }
  });

  urlObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Start
init();

console.log('Instagram Downloader content script loaded');
