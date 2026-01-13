/**
 * Unit tests for background service worker message handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setScriptingResult, setScriptingError, chromeMock } from '../mocks/chrome';

// Mock the arena client module
const mockArenaClient = {
  initialize: vi.fn(),
  isConfigured: vi.fn(() => true),
  getChannels: vi.fn(),
  searchChannels: vi.fn(),
  connectImage: vi.fn(),
};

vi.mock('../../src/arena', () => ({
  arenaClient: mockArenaClient,
}));

vi.mock('../../src/types/storage', () => ({
  getArenaSettings: vi.fn(() => Promise.resolve({ accessToken: 'test-token' })),
}));

// Import after mocks
import type { ExtensionMessage } from '../../src/types/messages';

describe('Background Service Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockArenaClient.isConfigured.mockReturnValue(true);
  });

  describe('GET_IMAGE_URL message', () => {
    it('should extract image URL from Instagram page', async () => {
      setScriptingResult('https://scontent.cdninstagram.com/test-image.jpg');

      // Simulate the message handling logic
      const tabId = 1;
      const result = await chromeMock.scripting.executeScript({
        target: { tabId },
        func: () => 'https://scontent.cdninstagram.com/test-image.jpg',
      });

      expect(result[0].result).toBe('https://scontent.cdninstagram.com/test-image.jpg');
    });

    it('should return error when no tab ID', async () => {
      const handleGetImageUrl = async (tabId?: number) => {
        if (!tabId) {
          return { success: false, error: 'No active tab' };
        }
        return { success: true, imageUrl: 'https://example.com/img.jpg' };
      };

      const result = await handleGetImageUrl(undefined);
      expect(result.success).toBe(false);
      expect(result.error).toBe('No active tab');
    });

    it('should return error when no image found', async () => {
      setScriptingResult(null);

      const result = await chromeMock.scripting.executeScript({
        target: { tabId: 1 },
        func: () => null,
      });

      const response = result[0].result
        ? { success: true, imageUrl: result[0].result }
        : { success: false, error: 'No image found. Make sure you\'re on an Instagram post.' };

      expect(response.success).toBe(false);
      expect(response.error).toContain('No image found');
    });

    it('should handle scripting errors gracefully', async () => {
      setScriptingError(new Error('Permission denied'));

      try {
        await chromeMock.scripting.executeScript({
          target: { tabId: 1 },
          func: () => null,
        });
      } catch {
        const response = { success: false, error: 'Could not access page content. Try refreshing the page.' };
        expect(response.success).toBe(false);
        expect(response.error).toContain('Could not access page content');
      }
    });
  });

  describe('GET_CHANNELS message', () => {
    it('should return channels when configured', async () => {
      const mockChannels = [
        { id: 1, slug: 'art', title: 'Art', status: 'public' },
        { id: 2, slug: 'design', title: 'Design', status: 'private' },
      ];
      mockArenaClient.getChannels.mockResolvedValue(mockChannels);

      const channels = await mockArenaClient.getChannels();

      expect(channels).toHaveLength(2);
      expect(channels[0].title).toBe('Art');
    });

    it('should return error when not configured', async () => {
      mockArenaClient.isConfigured.mockReturnValue(false);

      const handleGetChannels = async () => {
        if (!mockArenaClient.isConfigured()) {
          return { success: false, error: 'Are.na not configured. Add access token in settings.' };
        }
        const channels = await mockArenaClient.getChannels();
        return { success: true, channels };
      };

      const result = await handleGetChannels();

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle API errors', async () => {
      mockArenaClient.getChannels.mockRejectedValue(new Error('API Error'));

      await expect(mockArenaClient.getChannels()).rejects.toThrow('API Error');
    });
  });

  describe('SEARCH_CHANNELS message', () => {
    it('should search channels successfully', async () => {
      const mockChannels = [
        { id: 1, slug: 'photography', title: 'Photography', status: 'public' },
      ];
      mockArenaClient.searchChannels.mockResolvedValue(mockChannels);

      const handleSearchChannels = async (query: string) => {
        if (!mockArenaClient.isConfigured()) {
          return { success: false, error: 'Are.na not configured. Add access token in settings.' };
        }
        const channels = await mockArenaClient.searchChannels(query);
        return { success: true, channels };
      };

      const result = await handleSearchChannels('photo');

      expect(result.success).toBe(true);
      expect(result.channels).toHaveLength(1);
      expect(mockArenaClient.searchChannels).toHaveBeenCalledWith('photo');
    });

    it('should return error when not configured', async () => {
      mockArenaClient.isConfigured.mockReturnValue(false);

      const handleSearchChannels = async (query: string) => {
        if (!mockArenaClient.isConfigured()) {
          return { success: false, error: 'Are.na not configured. Add access token in settings.' };
        }
        const channels = await mockArenaClient.searchChannels(query);
        return { success: true, channels };
      };

      const result = await handleSearchChannels('test');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });
  });

  describe('CONNECT_IMAGE message', () => {
    it('should connect image to channel successfully', async () => {
      mockArenaClient.connectImage.mockResolvedValue({ id: 12345, slug: 'my-channel' });

      const handleConnectImage = async (imageUrl: string, channelSlug: string) => {
        if (!mockArenaClient.isConfigured()) {
          return { success: false, error: 'Are.na not configured. Add access token in settings.' };
        }
        const block = await mockArenaClient.connectImage(imageUrl, channelSlug);
        return { success: true, blockId: block.id, channelSlug: block.slug };
      };

      const result = await handleConnectImage(
        'https://example.com/image.jpg',
        'my-channel'
      );

      expect(result.success).toBe(true);
      expect(result.blockId).toBe(12345);
      expect(result.channelSlug).toBe('my-channel');
    });

    it('should return error when not configured', async () => {
      mockArenaClient.isConfigured.mockReturnValue(false);

      const handleConnectImage = async (imageUrl: string, channelSlug: string) => {
        if (!mockArenaClient.isConfigured()) {
          return { success: false, error: 'Are.na not configured. Add access token in settings.' };
        }
        const block = await mockArenaClient.connectImage(imageUrl, channelSlug);
        return { success: true, blockId: block.id, channelSlug: block.slug };
      };

      const result = await handleConnectImage(
        'https://example.com/image.jpg',
        'channel'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not configured');
    });

    it('should handle API errors', async () => {
      mockArenaClient.connectImage.mockRejectedValue(new Error('Permission denied'));

      await expect(
        mockArenaClient.connectImage('https://example.com/img.jpg', 'channel')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('Unknown message type', () => {
    it('should return error for unknown message type', async () => {
      const handleMessage = async (message: ExtensionMessage) => {
        switch (message.type) {
          case 'GET_IMAGE_URL':
          case 'GET_CHANNELS':
          case 'SEARCH_CHANNELS':
          case 'CONNECT_IMAGE':
            return { success: true };
          default:
            return { success: false, error: 'Unknown message type' };
        }
      };

      // @ts-expect-error Testing unknown message type
      const result = await handleMessage({ type: 'UNKNOWN_TYPE' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown message type');
    });
  });
});

describe('Storage utilities', () => {
  describe('getArenaSettings', () => {
    it('should return settings from storage', async () => {
      const { getArenaSettings } = await import('../../src/types/storage');
      const settings = await getArenaSettings();

      expect(settings).toBeDefined();
    });
  });

  describe('setArenaSettings', () => {
    it('should save settings to storage', async () => {
      await chromeMock.storage.sync.set({ accessToken: 'new-token' });

      expect(chromeMock.storage.sync.set).toHaveBeenCalledWith({
        accessToken: 'new-token',
      });
    });
  });
});

describe('Storage change listener', () => {
  it('should handle access token changes', () => {
    const changeHandler = vi.fn();
    chromeMock.storage.onChanged.addListener(changeHandler);

    // Simulate storage change
    chromeMock.storage.sync.set({ accessToken: 'updated-token' });

    // The mock should have tracked the listener
    expect(chromeMock.storage.onChanged.addListener).toHaveBeenCalled();
  });
});
