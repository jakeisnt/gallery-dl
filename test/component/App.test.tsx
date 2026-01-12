/**
 * Component tests for Popup App
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../src/popup/App';
import { chromeMock } from '../mocks/chrome';

// Mock CSS import
vi.mock('../../src/popup/styles.css', () => ({}));

// Helper type for message
interface TestMessage {
  type: string;
  query?: string;
  imageUrl?: string;
  channelSlug?: string;
}

describe('App Component', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock responses
    chromeMock.runtime.sendMessage.mockImplementation(
      (message: unknown, callback?: (response: unknown) => void) => {
        const msg = message as TestMessage;
        let response: unknown;

        if (msg.type === 'GET_IMAGE_URL') {
          response = {
            success: true,
            imageUrl: 'https://scontent.cdninstagram.com/test-image.jpg',
          };
        } else if (msg.type === 'GET_CHANNELS') {
          response = {
            success: true,
            channels: [
              { id: 1, slug: 'art', title: 'Art', status: 'public' },
              { id: 2, slug: 'design', title: 'Design', status: 'private' },
            ],
          };
        } else if (msg.type === 'SEARCH_CHANNELS') {
          response = {
            success: true,
            channels: [
              { id: 3, slug: 'photography', title: 'Photography', status: 'public' },
            ],
          };
        } else if (msg.type === 'CONNECT_IMAGE') {
          response = {
            success: true,
            blockId: 12345,
            channelSlug: 'art',
          };
        }

        if (callback) {
          setTimeout(() => callback(response), 0);
        }
        return Promise.resolve(response);
      }
    );
  });

  describe('Initial Loading', () => {
    it('should show loading state initially', () => {
      render(<App />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should fetch image URL on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
          { type: 'GET_IMAGE_URL' },
          expect.any(Function)
        );
      });
    });

    it('should fetch channels on mount', async () => {
      render(<App />);

      await waitFor(() => {
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
          { type: 'GET_CHANNELS' },
          expect.any(Function)
        );
      });
    });
  });

  describe('Image Display', () => {
    it('should display image preview after loading', async () => {
      render(<App />);

      await waitFor(() => {
        const img = screen.getByAltText('Instagram image preview');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'https://scontent.cdninstagram.com/test-image.jpg');
      });
    });

    it('should show error when no image found', async () => {
      chromeMock.runtime.sendMessage.mockImplementation(
        (message: unknown, callback?: (response: unknown) => void) => {
          const msg = message as TestMessage;
          let response: unknown;

          if (msg.type === 'GET_IMAGE_URL') {
            response = {
              success: false,
              error: 'No image found',
            };
          } else if (msg.type === 'GET_CHANNELS') {
            response = { success: true, channels: [] };
          }

          if (callback) {
            setTimeout(() => callback(response), 0);
          }
          return Promise.resolve(response);
        }
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('No image found');
      });
    });

    it('should show empty state when not on Instagram', async () => {
      chromeMock.runtime.sendMessage.mockImplementation(
        (message: unknown, callback?: (response: unknown) => void) => {
          const msg = message as TestMessage;
          let response: unknown;

          if (msg.type === 'GET_IMAGE_URL') {
            response = { success: false };
          } else if (msg.type === 'GET_CHANNELS') {
            response = { success: true, channels: [] };
          }

          if (callback) {
            setTimeout(() => callback(response), 0);
          }
          return Promise.resolve(response);
        }
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Navigate to an Instagram post to connect it to Are.na')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Channel List', () => {
    it('should display channels after loading', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
        expect(screen.getByText('Design')).toBeInTheDocument();
      });
    });

    it('should show hint when no channels', async () => {
      chromeMock.runtime.sendMessage.mockImplementation(
        (message: unknown, callback?: (response: unknown) => void) => {
          const msg = message as TestMessage;
          let response: unknown;

          if (msg.type === 'GET_IMAGE_URL') {
            response = {
              success: true,
              imageUrl: 'https://example.com/img.jpg',
            };
          } else if (msg.type === 'GET_CHANNELS') {
            response = { success: true, channels: [] };
          }

          if (callback) {
            setTimeout(() => callback(response), 0);
          }
          return Promise.resolve(response);
        }
      );

      render(<App />);

      await waitFor(() => {
        expect(
          screen.getByText('Search for a channel to connect this image')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should show search input', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search channels...')).toBeInTheDocument();
      });
    });

    it('should search channels on input', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search channels...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search channels...');
      await user.type(searchInput, 'photo');

      // Wait for debounced search
      await waitFor(
        () => {
          expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
            { type: 'SEARCH_CHANNELS', query: 'photo' },
            expect.any(Function)
          );
        },
        { timeout: 500 }
      );
    });

    it('should search on button click', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search channels...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search channels...');
      await user.type(searchInput, 'art');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
          { type: 'SEARCH_CHANNELS', query: 'art' },
          expect.any(Function)
        );
      });
    });

    it('should search on Enter key', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search channels...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search channels...');
      await user.type(searchInput, 'design{Enter}');

      await waitFor(() => {
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
          { type: 'SEARCH_CHANNELS', query: 'design' },
          expect.any(Function)
        );
      });
    });

    it('should show error for empty search', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search channels...')).toBeInTheDocument();
      });

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Enter a search term');
      });
    });

    it('should display search results', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search channels...')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search channels...');
      await user.type(searchInput, 'photo');

      const searchButton = screen.getByRole('button', { name: /search/i });
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Photography')).toBeInTheDocument();
      });
    });
  });

  describe('Connect to Channel', () => {
    it('should connect image when channel is clicked', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
      });

      const artButton = screen.getByText('Art');
      await user.click(artButton);

      await waitFor(() => {
        expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(
          {
            type: 'CONNECT_IMAGE',
            imageUrl: 'https://scontent.cdninstagram.com/test-image.jpg',
            channelSlug: 'art',
          },
          expect.any(Function)
        );
      });
    });

    it('should show success message after connecting', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
      });

      const artButton = screen.getByText('Art');
      await user.click(artButton);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('Added to Art');
      });
    });

    it('should show "Adding..." while connecting', async () => {
      // Delay the response
      chromeMock.runtime.sendMessage.mockImplementation(
        (message: unknown, callback?: (response: unknown) => void) => {
          const msg = message as TestMessage;
          let response: unknown;
          let delay = 0;

          if (msg.type === 'GET_IMAGE_URL') {
            response = {
              success: true,
              imageUrl: 'https://example.com/img.jpg',
            };
          } else if (msg.type === 'GET_CHANNELS') {
            response = {
              success: true,
              channels: [{ id: 1, slug: 'art', title: 'Art', status: 'public' }],
            };
          } else if (msg.type === 'CONNECT_IMAGE') {
            response = { success: true, blockId: 1, channelSlug: 'art' };
            delay = 100;
          }

          if (callback) {
            setTimeout(() => callback(response), delay);
          }
          return Promise.resolve(response);
        }
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
      });

      const artButton = screen.getByText('Art');
      await user.click(artButton);

      expect(screen.getByText('Adding...')).toBeInTheDocument();
    });

    it('should disable all channel buttons while connecting', async () => {
      chromeMock.runtime.sendMessage.mockImplementation(
        (message: unknown, callback?: (response: unknown) => void) => {
          const msg = message as TestMessage;
          let response: unknown;
          let delay = 0;

          if (msg.type === 'GET_IMAGE_URL') {
            response = {
              success: true,
              imageUrl: 'https://example.com/img.jpg',
            };
          } else if (msg.type === 'GET_CHANNELS') {
            response = {
              success: true,
              channels: [
                { id: 1, slug: 'art', title: 'Art', status: 'public' },
                { id: 2, slug: 'design', title: 'Design', status: 'public' },
              ],
            };
          } else if (msg.type === 'CONNECT_IMAGE') {
            response = { success: true, blockId: 1, channelSlug: 'art' };
            delay = 100;
          }

          if (callback) {
            setTimeout(() => callback(response), delay);
          }
          return Promise.resolve(response);
        }
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
        expect(screen.getByText('Design')).toBeInTheDocument();
      });

      const artButton = screen.getByText('Art');
      await user.click(artButton);

      // Design button should be disabled
      const designButton = screen.getByRole('listitem', { name: /Design/i });
      expect(designButton).toBeDisabled();
    });

    it('should show error on connection failure', async () => {
      chromeMock.runtime.sendMessage.mockImplementation(
        (message: unknown, callback?: (response: unknown) => void) => {
          const msg = message as TestMessage;
          let response: unknown;

          if (msg.type === 'GET_IMAGE_URL') {
            response = {
              success: true,
              imageUrl: 'https://example.com/img.jpg',
            };
          } else if (msg.type === 'GET_CHANNELS') {
            response = {
              success: true,
              channels: [{ id: 1, slug: 'art', title: 'Art', status: 'public' }],
            };
          } else if (msg.type === 'CONNECT_IMAGE') {
            response = { success: false, error: 'Connection failed' };
          }

          if (callback) {
            setTimeout(() => callback(response), 0);
          }
          return Promise.resolve(response);
        }
      );

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
      });

      const artButton = screen.getByText('Art');
      await user.click(artButton);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent('Connection failed');
      });
    });
  });

  describe('Settings Button', () => {
    it('should have settings button', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      expect(settingsButton).toBeInTheDocument();
    });

    it('should open options page when settings clicked', async () => {
      render(<App />);

      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      expect(chromeMock.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });

  describe('Success Message', () => {
    it('should make success message clickable', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
      });

      const artButton = screen.getByText('Art');
      await user.click(artButton);

      await waitFor(() => {
        const successMessage = screen.getByRole('status');
        expect(successMessage).toBeInTheDocument();
      });

      const successMessage = screen.getByRole('status');
      await user.click(successMessage);

      expect(chromeMock.tabs.create).toHaveBeenCalledWith({
        url: 'https://www.are.na/art',
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<App />);

      // Wait for loading to complete and search to appear
      await waitFor(() => {
        expect(screen.getByRole('search')).toBeInTheDocument();
      });

      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('list', { name: /channels/i })).toBeInTheDocument();
    });

    it('should have proper button labels', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Art')).toBeInTheDocument();
      });

      const artButton = screen.getByRole('listitem', { name: /Add to Art/i });
      expect(artButton).toBeInTheDocument();
    });

    it('should use aria-live for alerts', async () => {
      chromeMock.runtime.sendMessage.mockImplementation(
        (message: unknown, callback?: (response: unknown) => void) => {
          const msg = message as TestMessage;
          let response: unknown;

          if (msg.type === 'GET_IMAGE_URL') {
            response = { success: false, error: 'Test error' };
          } else if (msg.type === 'GET_CHANNELS') {
            response = { success: true, channels: [] };
          }

          if (callback) {
            setTimeout(() => callback(response), 0);
          }
          return Promise.resolve(response);
        }
      );

      render(<App />);

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});

describe('Debounce utility', () => {
  it('should debounce function calls', async () => {
    vi.useFakeTimers();
    const fn = vi.fn();

    // Simple debounce implementation
    function debounce<T extends (...args: Parameters<T>) => void>(
      callback: T,
      delay: number
    ): (...args: Parameters<T>) => void {
      let timeoutId: ReturnType<typeof setTimeout>;
      return (...args: Parameters<T>) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), delay);
      };
    }

    const debouncedFn = debounce(fn, 300);

    debouncedFn('a');
    debouncedFn('b');
    debouncedFn('c');

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');

    vi.useRealTimers();
  });
});
