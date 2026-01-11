/**
 * Options Page - Are.na settings
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { getArenaSettings, setArenaSettings } from '../types/storage';

function Options(): JSX.Element {
  const [token, setToken] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getArenaSettings().then(s => setToken(s.accessToken));
  }, []);

  const handleSave = async () => {
    await setArenaSettings({ accessToken: token });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', fontFamily: 'system-ui' }}>
      <h1 style={{ marginBottom: 24 }}>Instagram to Are.na</h1>

      <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
        Are.na Access Token
      </label>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="Paste your access token"
        style={{
          width: '100%',
          padding: 10,
          marginBottom: 8,
          border: '1px solid #ddd',
          borderRadius: 4,
        }}
      />
      <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>
        Get your token at{' '}
        <a href="https://dev.are.na/oauth/applications" target="_blank" rel="noreferrer">
          dev.are.na/oauth/applications
        </a>
      </p>

      <button
        onClick={handleSave}
        style={{
          padding: '10px 20px',
          background: '#000',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Save
      </button>

      {saved && (
        <span style={{ marginLeft: 12, color: '#060' }}>Saved!</span>
      )}
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<Options />);
}
