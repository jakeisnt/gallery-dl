/**
 * Popup - Connect Instagram images to Are.na
 */

import React, { useState, useEffect } from 'react';
import type { ArenaChannel } from '../arena';
import type { ImageUrlResponse, ChannelsResponse, ConnectResponse } from '../types/messages';
import './styles.css';

export function App(): JSX.Element {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [channels, setChannels] = useState<ArenaChannel[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  const handleSearch = () => {
    if (!search.trim()) return;
    setLoading(true);
    chrome.runtime.sendMessage({ type: 'SEARCH_CHANNELS', query: search }, (res: ChannelsResponse) => {
      if (res.success && res.channels) {
        setChannels(res.channels);
      } else {
        setError(res.error || 'Search failed');
      }
      setLoading(false);
    });
  };

  const handleConnect = (channel: ArenaChannel) => {
    if (!imageUrl) return;
    setConnecting(channel.slug);
    setError(null);

    chrome.runtime.sendMessage(
      { type: 'CONNECT_IMAGE', imageUrl, channelSlug: channel.slug },
      (res: ConnectResponse) => {
        setConnecting(null);
        if (res.success) {
          setSuccess(`Added to ${channel.title}`);
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(res.error || 'Failed to connect');
        }
      }
    );
  };

  return (
    <div className="popup">
      <header>
        <h1>Instagram to Are.na</h1>
        <button className="settings" onClick={() => chrome.runtime.openOptionsPage()}>
          Settings
        </button>
      </header>

      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {loading && <div className="loading">Loading...</div>}

      {!loading && imageUrl && (
        <>
          <div className="preview">
            <img src={imageUrl} alt="Preview" />
          </div>

          <div className="search">
            <input
              type="text"
              placeholder="Search channels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>Search</button>
          </div>

          <div className="channels">
            {channels.map((channel) => (
              <button
                key={channel.id}
                className="channel"
                onClick={() => handleConnect(channel)}
                disabled={connecting !== null}
              >
                {connecting === channel.slug ? 'Adding...' : channel.title}
              </button>
            ))}
            {channels.length === 0 && (
              <p className="hint">Search for a channel to connect this image</p>
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
