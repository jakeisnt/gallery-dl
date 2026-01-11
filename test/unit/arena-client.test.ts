/**
 * Unit tests for Are.na client
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GalleryArenaClient, ArenaApiError } from '../../src/arena/arena-client';

// Mock arena-ts module
vi.mock('arena-ts', () => ({
  ArenaClient: vi.fn().mockImplementation(() => ({
    me: vi.fn(),
    search: {
      channels: vi.fn(),
    },
    channel: vi.fn(),
  })),
}));

describe('ArenaApiError', () => {
  it('should create error with message only', () => {
    const error = new ArenaApiError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ArenaApiError');
    expect(error.statusCode).toBeUndefined();
    expect(error.isRetryable).toBe(false);
  });

  it('should create error with status code', () => {
    const error = new ArenaApiError('Unauthorized', 401);
    expect(error.message).toBe('Unauthorized');
    expect(error.statusCode).toBe(401);
    expect(error.isRetryable).toBe(false);
  });

  it('should create error with retryable flag', () => {
    const error = new ArenaApiError('Rate limited', 429, true);
    expect(error.message).toBe('Rate limited');
    expect(error.statusCode).toBe(429);
    expect(error.isRetryable).toBe(true);
  });

  it('should be instanceof Error', () => {
    const error = new ArenaApiError('Test');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(ArenaApiError);
  });
});

describe('GalleryArenaClient', () => {
  let client: GalleryArenaClient;

  beforeEach(() => {
    client = new GalleryArenaClient();
    vi.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize with valid access token', () => {
      expect(() => client.initialize('valid-token')).not.toThrow();
      expect(client.isConfigured()).toBe(true);
    });

    it('should trim whitespace from access token', () => {
      expect(() => client.initialize('  token-with-spaces  ')).not.toThrow();
      expect(client.isConfigured()).toBe(true);
    });

    it('should throw error for empty access token', () => {
      expect(() => client.initialize('')).toThrow(ArenaApiError);
      expect(() => client.initialize('')).toThrow('Access token is required');
    });

    it('should throw error for whitespace-only access token', () => {
      expect(() => client.initialize('   ')).toThrow(ArenaApiError);
      expect(() => client.initialize('   ')).toThrow('Access token is required');
    });
  });

  describe('isConfigured', () => {
    it('should return false before initialization', () => {
      expect(client.isConfigured()).toBe(false);
    });

    it('should return true after initialization', () => {
      client.initialize('test-token');
      expect(client.isConfigured()).toBe(true);
    });
  });

  describe('getChannels', () => {
    it('should throw error when not configured', async () => {
      await expect(client.getChannels()).rejects.toThrow(ArenaApiError);
      await expect(client.getChannels()).rejects.toThrow('Are.na not configured');
    });

    it('should return channels from API', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockMe = vi.fn().mockResolvedValue({
        channels: [
          { id: 1, slug: 'channel-1', title: 'Channel 1', status: 'public' },
          { id: 2, slug: 'channel-2', title: 'Channel 2', status: 'private' },
        ],
      });
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: mockMe,
        search: { channels: vi.fn() },
        channel: vi.fn(),
      }));

      client.initialize('test-token');
      const channels = await client.getChannels();

      expect(channels).toHaveLength(2);
      expect(channels[0]).toEqual({
        id: 1,
        slug: 'channel-1',
        title: 'Channel 1',
        status: 'public',
      });
      expect(channels[1]).toEqual({
        id: 2,
        slug: 'channel-2',
        title: 'Channel 2',
        status: 'private',
      });
    });

    it('should handle empty channels array', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockMe = vi.fn().mockResolvedValue({ channels: [] });
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: mockMe,
        search: { channels: vi.fn() },
        channel: vi.fn(),
      }));

      client.initialize('test-token');
      const channels = await client.getChannels();

      expect(channels).toHaveLength(0);
    });

    it('should handle undefined channels', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockMe = vi.fn().mockResolvedValue({});
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: mockMe,
        search: { channels: vi.fn() },
        channel: vi.fn(),
      }));

      client.initialize('test-token');
      const channels = await client.getChannels();

      expect(channels).toHaveLength(0);
    });

    it('should handle 401 unauthorized error', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockMe = vi.fn().mockRejectedValue(new Error('401 Unauthorized'));
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: mockMe,
        search: { channels: vi.fn() },
        channel: vi.fn(),
      }));

      client.initialize('test-token');
      await expect(client.getChannels()).rejects.toThrow('Invalid Are.na access token');
    });

    it('should handle 403 forbidden error', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockMe = vi.fn().mockRejectedValue(new Error('403 Forbidden'));
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: mockMe,
        search: { channels: vi.fn() },
        channel: vi.fn(),
      }));

      client.initialize('test-token');
      await expect(client.getChannels()).rejects.toThrow('Access denied');
    });

    it('should handle 429 rate limit error', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockMe = vi.fn().mockRejectedValue(new Error('429 Rate limit exceeded'));
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: mockMe,
        search: { channels: vi.fn() },
        channel: vi.fn(),
      }));

      client.initialize('test-token');

      try {
        await client.getChannels();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ArenaApiError);
        expect((error as ArenaApiError).isRetryable).toBe(true);
        expect((error as ArenaApiError).statusCode).toBe(429);
      }
    });

    it('should handle network errors as retryable', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockMe = vi.fn().mockRejectedValue(new Error('Network error'));
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: mockMe,
        search: { channels: vi.fn() },
        channel: vi.fn(),
      }));

      client.initialize('test-token');

      try {
        await client.getChannels();
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ArenaApiError);
        expect((error as ArenaApiError).isRetryable).toBe(true);
      }
    });
  });

  describe('searchChannels', () => {
    it('should throw error when not configured', async () => {
      await expect(client.searchChannels('test')).rejects.toThrow(ArenaApiError);
      await expect(client.searchChannels('test')).rejects.toThrow('Are.na not configured');
    });

    it('should throw error for empty query', async () => {
      client.initialize('test-token');
      await expect(client.searchChannels('')).rejects.toThrow('Search query is required');
    });

    it('should throw error for whitespace-only query', async () => {
      client.initialize('test-token');
      await expect(client.searchChannels('   ')).rejects.toThrow('Search query is required');
    });

    it('should throw error for query exceeding 200 characters', async () => {
      client.initialize('test-token');
      const longQuery = 'a'.repeat(201);
      await expect(client.searchChannels(longQuery)).rejects.toThrow('Search query is too long');
    });

    it('should search channels successfully', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockSearchChannels = vi.fn().mockResolvedValue({
        channels: [
          { id: 1, slug: 'art-channel', title: 'Art Channel', status: 'public' },
          { id: 2, slug: 'art-gallery', title: 'Art Gallery', status: 'closed' },
        ],
      });
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: vi.fn(),
        search: { channels: mockSearchChannels },
        channel: vi.fn(),
      }));

      client.initialize('test-token');
      const channels = await client.searchChannels('art');

      expect(mockSearchChannels).toHaveBeenCalledWith('art', { per: 20 });
      expect(channels).toHaveLength(2);
      expect(channels[0].title).toBe('Art Channel');
    });

    it('should trim search query', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockSearchChannels = vi.fn().mockResolvedValue({ channels: [] });
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: vi.fn(),
        search: { channels: mockSearchChannels },
        channel: vi.fn(),
      }));

      client.initialize('test-token');
      await client.searchChannels('  art  ');

      expect(mockSearchChannels).toHaveBeenCalledWith('art', { per: 20 });
    });
  });

  describe('connectImage', () => {
    it('should throw error when not configured', async () => {
      await expect(
        client.connectImage('https://example.com/image.jpg', 'channel-slug')
      ).rejects.toThrow('Are.na not configured');
    });

    it('should throw error for invalid URL', async () => {
      client.initialize('test-token');
      await expect(
        client.connectImage('not-a-valid-url', 'channel-slug')
      ).rejects.toThrow('Invalid image URL');
    });

    it('should throw error for non-http URL', async () => {
      client.initialize('test-token');
      await expect(
        client.connectImage('ftp://example.com/image.jpg', 'channel-slug')
      ).rejects.toThrow('Invalid image URL');
    });

    it('should throw error for invalid channel slug', async () => {
      client.initialize('test-token');
      await expect(
        client.connectImage('https://example.com/image.jpg', '')
      ).rejects.toThrow('Invalid channel slug');
    });

    it('should throw error for slug with invalid characters', async () => {
      client.initialize('test-token');
      await expect(
        client.connectImage('https://example.com/image.jpg', 'invalid slug!')
      ).rejects.toThrow('Invalid channel slug');
    });

    it('should throw error for slug exceeding 255 characters', async () => {
      client.initialize('test-token');
      const longSlug = 'a'.repeat(256);
      await expect(
        client.connectImage('https://example.com/image.jpg', longSlug)
      ).rejects.toThrow('Invalid channel slug');
    });

    it('should connect image successfully', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockCreateBlock = vi.fn().mockResolvedValue({ id: 12345 });
      const mockChannel = vi.fn().mockReturnValue({ createBlock: mockCreateBlock });
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: vi.fn(),
        search: { channels: vi.fn() },
        channel: mockChannel,
      }));

      client.initialize('test-token');
      const block = await client.connectImage(
        'https://example.com/image.jpg',
        'my-channel'
      );

      expect(mockChannel).toHaveBeenCalledWith('my-channel');
      expect(mockCreateBlock).toHaveBeenCalledWith({
        source: 'https://example.com/image.jpg',
      });
      expect(block).toEqual({ id: 12345, slug: 'my-channel' });
    });

    it('should accept http URLs', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockCreateBlock = vi.fn().mockResolvedValue({ id: 1 });
      const mockChannel = vi.fn().mockReturnValue({ createBlock: mockCreateBlock });
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: vi.fn(),
        search: { channels: vi.fn() },
        channel: mockChannel,
      }));

      client.initialize('test-token');
      await expect(
        client.connectImage('http://example.com/image.jpg', 'channel')
      ).resolves.toBeDefined();
    });

    it('should handle 404 not found error', async () => {
      const { ArenaClient } = await import('arena-ts');
      const mockCreateBlock = vi.fn().mockRejectedValue(new Error('404 Not Found'));
      const mockChannel = vi.fn().mockReturnValue({ createBlock: mockCreateBlock });
      (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
        me: vi.fn(),
        search: { channels: vi.fn() },
        channel: mockChannel,
      }));

      client.initialize('test-token');
      await expect(
        client.connectImage('https://example.com/image.jpg', 'nonexistent')
      ).rejects.toThrow('Channel not found');
    });
  });
});

describe('URL validation', () => {
  let client: GalleryArenaClient;

  beforeEach(() => {
    client = new GalleryArenaClient();
    client.initialize('test-token');
  });

  it.each([
    'https://example.com/image.jpg',
    'https://www.instagram.com/p/test/',
    'http://localhost:3000/image.png',
    'https://cdn.example.com/path/to/image.webp',
  ])('should accept valid URL: %s', async (url) => {
    const { ArenaClient } = await import('arena-ts');
    const mockCreateBlock = vi.fn().mockResolvedValue({ id: 1 });
    (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      me: vi.fn(),
      search: { channels: vi.fn() },
      channel: () => ({ createBlock: mockCreateBlock }),
    }));

    // Re-initialize client with new mock
    client = new GalleryArenaClient();
    client.initialize('test-token');

    await expect(client.connectImage(url, 'test')).resolves.toBeDefined();
  });

  it.each([
    'not-a-url',
    'ftp://example.com/file',
    'file:///local/path',
    'javascript:alert(1)',
    'data:image/png;base64,abc',
  ])('should reject invalid URL: %s', async (url) => {
    await expect(client.connectImage(url, 'test')).rejects.toThrow('Invalid image URL');
  });
});

describe('Slug validation', () => {
  let client: GalleryArenaClient;

  beforeEach(() => {
    client = new GalleryArenaClient();
    client.initialize('test-token');
  });

  it.each([
    'valid-slug',
    'channel-123',
    'ABC',
    'a',
    '123',
    'my-awesome-channel',
  ])('should accept valid slug: %s', async (slug) => {
    const { ArenaClient } = await import('arena-ts');
    const mockCreateBlock = vi.fn().mockResolvedValue({ id: 1 });
    (ArenaClient as unknown as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      me: vi.fn(),
      search: { channels: vi.fn() },
      channel: () => ({ createBlock: mockCreateBlock }),
    }));

    // Re-initialize client with new mock
    client = new GalleryArenaClient();
    client.initialize('test-token');

    await expect(
      client.connectImage('https://example.com/img.jpg', slug)
    ).resolves.toBeDefined();
  });

  it.each([
    '',
    'has spaces',
    'has_underscore',
    'has.dot',
    'has@symbol',
    'has/slash',
  ])('should reject invalid slug: %s', async (slug) => {
    await expect(
      client.connectImage('https://example.com/img.jpg', slug)
    ).rejects.toThrow('Invalid channel slug');
  });
});
