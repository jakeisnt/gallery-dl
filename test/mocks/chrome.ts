/**
 * Chrome Extension API Mocks
 * Comprehensive mocks for testing Chrome extension functionality
 */

import { vi } from 'vitest';

// Storage data store
let storageData: Record<string, unknown> = {};

// Message listeners
type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => boolean | void;

let messageListeners: MessageListener[] = [];

// Storage change listeners
type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void;

let storageChangeListeners: StorageChangeListener[] = [];

// Chrome storage mock
const storageMock = {
  sync: {
    get: vi.fn((keys: string | string[] | Record<string, unknown> | null) => {
      return new Promise<Record<string, unknown>>((resolve) => {
        if (keys === null) {
          resolve({ ...storageData });
        } else if (typeof keys === 'string') {
          resolve({ [keys]: storageData[keys] });
        } else if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          keys.forEach(key => {
            if (key in storageData) {
              result[key] = storageData[key];
            }
          });
          resolve(result);
        } else {
          const result: Record<string, unknown> = {};
          Object.keys(keys).forEach(key => {
            result[key] = key in storageData ? storageData[key] : keys[key];
          });
          resolve(result);
        }
      });
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      return new Promise<void>((resolve) => {
        const changes: Record<string, chrome.storage.StorageChange> = {};
        Object.entries(items).forEach(([key, newValue]) => {
          changes[key] = { oldValue: storageData[key], newValue };
          storageData[key] = newValue;
        });
        // Trigger change listeners
        storageChangeListeners.forEach(listener => listener(changes, 'sync'));
        resolve();
      });
    }),
    remove: vi.fn((keys: string | string[]) => {
      return new Promise<void>((resolve) => {
        const keysArray = Array.isArray(keys) ? keys : [keys];
        keysArray.forEach(key => {
          delete storageData[key];
        });
        resolve();
      });
    }),
    clear: vi.fn(() => {
      return new Promise<void>((resolve) => {
        storageData = {};
        resolve();
      });
    }),
  },
  local: {
    get: vi.fn(() => Promise.resolve({})),
    set: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  },
  onChanged: {
    addListener: vi.fn((callback: StorageChangeListener) => {
      storageChangeListeners.push(callback);
    }),
    removeListener: vi.fn((callback: StorageChangeListener) => {
      storageChangeListeners = storageChangeListeners.filter(l => l !== callback);
    }),
    hasListener: vi.fn((callback: unknown) =>
      storageChangeListeners.includes(callback as StorageChangeListener)
    ),
  },
};

// Chrome runtime mock
const runtimeMock = {
  sendMessage: vi.fn((message: unknown, callback?: (response: unknown) => void) => {
    // Simulate async message handling
    return new Promise<unknown>((resolve) => {
      setTimeout(() => {
        if (callback) {
          callback({ success: true });
        }
        resolve({ success: true });
      }, 0);
    });
  }),
  onMessage: {
    addListener: vi.fn((callback: MessageListener) => {
      messageListeners.push(callback);
    }),
    removeListener: vi.fn((callback: unknown) => {
      messageListeners = messageListeners.filter(l => l !== callback);
    }),
    hasListener: vi.fn((callback: unknown) =>
      messageListeners.includes(callback as MessageListener)
    ),
  },
  openOptionsPage: vi.fn(() => Promise.resolve()),
  getURL: vi.fn((path: string) => `chrome-extension://test-extension-id/${path}`),
  id: 'test-extension-id',
  lastError: null as chrome.runtime.LastError | null,
};

// Chrome tabs mock
const tabsMock = {
  create: vi.fn((createProperties: chrome.tabs.CreateProperties) => {
    return Promise.resolve({
      id: Math.floor(Math.random() * 10000),
      url: createProperties.url,
      active: createProperties.active ?? true,
      windowId: 1,
      index: 0,
      pinned: false,
      highlighted: true,
      incognito: false,
      selected: true,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    } as chrome.tabs.Tab);
  }),
  query: vi.fn(() => {
    return Promise.resolve([
      {
        id: 1,
        url: 'https://www.instagram.com/p/test-post/',
        active: true,
        windowId: 1,
        index: 0,
        pinned: false,
        highlighted: true,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      },
    ] as chrome.tabs.Tab[]);
  }),
  get: vi.fn((tabId: number) => {
    return Promise.resolve({
      id: tabId,
      url: 'https://www.instagram.com/p/test-post/',
      active: true,
      windowId: 1,
      index: 0,
      pinned: false,
      highlighted: true,
      incognito: false,
      selected: true,
      discarded: false,
      autoDiscardable: true,
      groupId: -1,
    } as chrome.tabs.Tab);
  }),
  update: vi.fn(() => Promise.resolve({} as chrome.tabs.Tab)),
  remove: vi.fn(() => Promise.resolve()),
};

// Chrome scripting mock
const scriptingMock = {
  executeScript: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_injection: chrome.scripting.ScriptInjection<unknown[], unknown>) => {
      return Promise.resolve([
        {
          frameId: 0,
          result: 'https://scontent.cdninstagram.com/test-image.jpg',
        },
      ] as chrome.scripting.InjectionResult<unknown>[]);
    }
  ),
};

// Combined chrome mock object
export const chromeMock = {
  storage: storageMock,
  runtime: runtimeMock,
  tabs: tabsMock,
  scripting: scriptingMock,
};

// Reset all mocks and storage
export function resetChromeMocks(): void {
  storageData = {};
  messageListeners = [];
  storageChangeListeners = [];

  // Reset all mock functions
  storageMock.sync.get.mockClear();
  storageMock.sync.set.mockClear();
  storageMock.sync.remove.mockClear();
  storageMock.sync.clear.mockClear();
  storageMock.local.get.mockClear();
  storageMock.local.set.mockClear();
  storageMock.local.remove.mockClear();
  storageMock.local.clear.mockClear();
  storageMock.onChanged.addListener.mockClear();
  storageMock.onChanged.removeListener.mockClear();
  storageMock.onChanged.hasListener.mockClear();

  runtimeMock.sendMessage.mockClear();
  runtimeMock.onMessage.addListener.mockClear();
  runtimeMock.onMessage.removeListener.mockClear();
  runtimeMock.onMessage.hasListener.mockClear();
  runtimeMock.openOptionsPage.mockClear();
  runtimeMock.getURL.mockClear();

  tabsMock.create.mockClear();
  tabsMock.query.mockClear();
  tabsMock.get.mockClear();
  tabsMock.update.mockClear();
  tabsMock.remove.mockClear();

  scriptingMock.executeScript.mockClear();

  runtimeMock.lastError = null;
}

// Helper to set storage data for tests
export function setStorageData(data: Record<string, unknown>): void {
  storageData = { ...data };
}

// Helper to get current storage data
export function getStorageData(): Record<string, unknown> {
  return { ...storageData };
}

// Helper to simulate message sending to listeners
export function simulateMessage(
  message: unknown,
  sender: Partial<chrome.runtime.MessageSender> = {}
): Promise<unknown> {
  return new Promise((resolve) => {
    const fullSender: chrome.runtime.MessageSender = {
      id: 'test-extension-id',
      tab: {
        id: 1,
        index: 0,
        windowId: 1,
        highlighted: true,
        active: true,
        pinned: false,
        incognito: false,
        selected: true,
        discarded: false,
        autoDiscardable: true,
        groupId: -1,
      },
      ...sender,
    };

    let response: unknown;
    const sendResponse = (res?: unknown) => {
      response = res;
    };

    for (const listener of messageListeners) {
      const isAsync = listener(message, fullSender, sendResponse);
      if (isAsync === true) {
        // Async response expected
        setTimeout(() => resolve(response), 0);
        return;
      }
    }

    resolve(response);
  });
}

// Helper to configure scripting mock response
export function setScriptingResult(result: unknown): void {
  scriptingMock.executeScript.mockResolvedValue([
    { frameId: 0, result },
  ] as chrome.scripting.InjectionResult<unknown>[]);
}

// Helper to configure scripting mock error
export function setScriptingError(error: Error): void {
  scriptingMock.executeScript.mockRejectedValue(error);
}

// Helper to configure sendMessage mock response
export function setSendMessageResponse(response: unknown): void {
  runtimeMock.sendMessage.mockImplementation(
    (_message: unknown, callback?: (response: unknown) => void) => {
      return new Promise<unknown>((resolve) => {
        setTimeout(() => {
          if (callback) {
            callback(response);
          }
          resolve(response);
        }, 0);
      });
    }
  );
}
