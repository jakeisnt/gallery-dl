/**
 * Popup - Connect Instagram images to Are.na
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { ArenaChannel } from '../arena';
import type { ImageUrlResponse, ChannelsResponse, ConnectResponse } from '../types/messages';
import './styles.css';

const ARENA_BASE_URL = 'https://www.are.na';
const SUCCESS_MESSAGE_DURATION = 5000;
const DEBOUNCE_DELAY = 300;

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function App(): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ message: string; url: string } | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_IMAGE_URL' }, (res: ImageUrlResponse) => {
      if (res.success && res.imageUrl) {
        setImageUrl(res.imageUrl);
      } else {
        setError(res.error || 'No image found');
      }
      setLoading(false);
    });

    chrome.runtime.sendMessage({ type: 'GET_CHANNELS' }, (res: ChannelsResponse) => {
      if (res.success && res.channels) {
        setChannels(res.channels);
      }
    });
  }, []);

  const performSearch = useCallback((query: string) => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    chrome.runtime.sendMessage({ type: 'SEARCH_CHANNELS', query }, (res: ChannelsResponse) => {
      if (res.success && res.channels) {
        setChannels(res.channels);
      } else {
        setError(res.error || 'Search failed');
      }
      setSearching(false);
    });
  }, []);

  const debouncedSearch = useCallback(
    debounce((query: string) => performSearch(query), DEBOUNCE_DELAY),
    [performSearch]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    if (value.trim()) {
      debouncedSearch(value);
    }
  };

  const handleSearchSubmit = () => {
    if (!search.trim()) {
      setError('Enter a search term');
      searchInputRef.current?.focus();
      return;
    }
    performSearch(search);
  };

  const handleConnect = (channel: ArenaChannel) => {
    if (!imageUrl) return;
    setConnecting(channel.slug);
    setError(null);
    setSuccess(null);

    chrome.runtime.sendMessage(
      { type: 'CONNECT_IMAGE', imageUrl, channelSlug: channel.slug },
      (res: ConnectResponse) => {
        setConnecting(null);
        if (res.success && res.channelSlug) {
          const blockUrl = `${ARENA_BASE_URL}/${res.channelSlug}`;
          setSuccess({
            message: `Added to ${channel.title}`,
            url: blockUrl,
          });
          setTimeout(() => setSuccess(null), SUCCESS_MESSAGE_DURATION);
        } else {
          setError(res.error || 'Failed to connect');
        }
      }
    );
  };

  const handleSuccessClick = () => {
    if (success?.url) {
      chrome.tabs.create({ url: success.url });
    }
  };

  return (
    <div className="popup" role="main">
      <header>
        <h1>Instagram to Are.na</h1>
        <button
          className="settings"
          onClick={() => chrome.runtime.openOptionsPage()}
          aria-label="Open settings"
          title="Settings"
        >
          ⚙
        </button>
      </header>

      {error && (
        <div className="error" role="alert" aria-live="polite">
          {error}
        </div>
      )}
      {success && (
        <button
          className="success"
          onClick={handleSuccessClick}
          role="status"
          aria-live="polite"
          title="Click to view in Are.na"
        >
          {success.message} — View →
        </button>
      )}

      {loading && (
        <div className="loading" aria-busy="true" aria-label="Loading">
          Loading...
        </div>
      )}

      {!loading && imageUrl && (
        <>
          <div className="preview">
            <img src={imageUrl} alt="Instagram image preview" loading="lazy" />
          </div>

          <div className="search" role="search">
            <label htmlFor="channel-search" className="visually-hidden">
              Search channels
            </label>
            <input
              ref={searchInputRef}
              id="channel-search"
              type="text"
              placeholder="Search channels..."
              value={search}
              onChange={handleSearchChange}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
              aria-describedby="search-hint"
            />
            <button
              onClick={handleSearchSubmit}
              disabled={searching}
              aria-label={searching ? 'Searching...' : 'Search channels'}
            >
              {searching ? '...' : 'Search'}
            </button>
          </div>

          <div className="channels" role="list" aria-label="Available channels">
            {channels.map((channel) => (
              <button
                key={channel.id}
                className="channel"
                onClick={() => handleConnect(channel)}
                disabled={connecting !== null}
                role="listitem"
                aria-label={`Add to ${channel.title}${connecting === channel.slug ? ' (adding...)' : ''}`}
              >
                {connecting === channel.slug ? 'Adding...' : channel.title}
              </button>
            ))}
            {channels.length === 0 && !searching && (
              <p className="hint" id="search-hint">
                Search for a channel to connect this image
              </p>
            )}
            {searching && channels.length === 0 && (
              <p className="hint" aria-busy="true">
                Searching...
              </p>
            )}
          </div>
        </>
      )}

      {!loading && !imageUrl && (
        <div className="empty">
          <p>Navigate to an Instagram post to connect it to Are.na</p>
        </div>
      )}
    </div>
  );
}
