/**
 * Options Page
 */

import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  UserPreferences,
  DEFAULT_PREFERENCES,
  getPreferences,
  setPreferences,
} from '../types/storage';

function OptionsApp(): JSX.Element {
  const [prefs, setPrefs] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPreferences().then((p) => {
      setPrefs(p);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    await setPreferences(prefs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setPrefs(DEFAULT_PREFERENCES);
  };

  const updatePref = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="options-container">
      <header className="options-header">
        <h1>Instagram Downloader Settings</h1>
      </header>

      <main className="options-content">
        <section className="options-section">
          <h2>Download Settings</h2>

          <div className="option-group">
            <label htmlFor="downloadDirectory">Download Directory</label>
            <input
              type="text"
              id="downloadDirectory"
              value={prefs.downloadDirectory}
              onChange={(e) => updatePref('downloadDirectory', e.target.value)}
              placeholder="Instagram"
            />
            <p className="option-help">
              Folder name within your Downloads directory
            </p>
          </div>

          <div className="option-group">
            <label htmlFor="filenameTemplate">Filename Template</label>
            <input
              type="text"
              id="filenameTemplate"
              value={prefs.filenameTemplate}
              onChange={(e) => updatePref('filenameTemplate', e.target.value)}
              placeholder="{username}_{shortcode}_{num}.{extension}"
            />
            <p className="option-help">
              Available placeholders: {'{username}'}, {'{shortcode}'}, {'{postId}'}, {'{num}'}, {'{timestamp}'}, {'{date}'}, {'{extension}'}
            </p>
          </div>

          <div className="option-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={prefs.includeVideos}
                onChange={(e) => updatePref('includeVideos', e.target.checked)}
              />
              <span>Download videos</span>
            </label>
          </div>

          <div className="option-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={prefs.includeImages}
                onChange={(e) => updatePref('includeImages', e.target.checked)}
              />
              <span>Download images</span>
            </label>
          </div>

          <div className="option-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={prefs.skipExisting}
                onChange={(e) => updatePref('skipExisting', e.target.checked)}
              />
              <span>Skip existing files (rename duplicates)</span>
            </label>
          </div>
        </section>

        <section className="options-section">
          <h2>Rate Limiting</h2>

          <div className="option-group">
            <label htmlFor="minDelay">Minimum delay between requests (ms)</label>
            <input
              type="number"
              id="minDelay"
              value={prefs.minDelayMs}
              onChange={(e) => updatePref('minDelayMs', parseInt(e.target.value) || 1000)}
              min={500}
              max={10000}
            />
          </div>

          <div className="option-group">
            <label htmlFor="maxDelay">Maximum delay between requests (ms)</label>
            <input
              type="number"
              id="maxDelay"
              value={prefs.maxDelayMs}
              onChange={(e) => updatePref('maxDelayMs', parseInt(e.target.value) || 3000)}
              min={1000}
              max={30000}
            />
          </div>
        </section>

        <section className="options-section">
          <h2>Notifications</h2>

          <div className="option-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={prefs.showNotifications}
                onChange={(e) => updatePref('showNotifications', e.target.checked)}
              />
              <span>Show download notifications</span>
            </label>
          </div>
        </section>

        <div className="options-actions">
          <button className="btn btn-secondary" onClick={handleReset}>
            Reset to Defaults
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            Save Settings
          </button>
        </div>

        {saved && (
          <div className="save-message">
            Settings saved successfully!
          </div>
        )}
      </main>
    </div>
  );
}

// Styles
const styles = document.createElement('style');
styles.textContent = `
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    font-size: 14px;
    line-height: 1.6;
    color: #262626;
    background: #fafafa;
  }

  .options-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 24px;
  }

  .options-header {
    margin-bottom: 32px;
  }

  .options-header h1 {
    font-size: 24px;
    font-weight: 600;
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .options-section {
    background: white;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .options-section h2 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #dbdbdb;
  }

  .option-group {
    margin-bottom: 16px;
  }

  .option-group label {
    display: block;
    font-weight: 500;
    margin-bottom: 4px;
  }

  .option-group input[type="text"],
  .option-group input[type="number"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #dbdbdb;
    border-radius: 4px;
    font-size: 14px;
  }

  .option-group input[type="text"]:focus,
  .option-group input[type="number"]:focus {
    outline: none;
    border-color: #0095f6;
  }

  .option-help {
    font-size: 12px;
    color: #8e8e8e;
    margin-top: 4px;
  }

  .checkbox-group label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }

  .checkbox-group input[type="checkbox"] {
    width: 18px;
    height: 18px;
  }

  .options-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn {
    padding: 10px 20px;
    border: none;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .btn:hover {
    opacity: 0.9;
  }

  .btn-primary {
    background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888);
    color: white;
  }

  .btn-secondary {
    background: #efefef;
    color: #262626;
  }

  .save-message {
    margin-top: 16px;
    padding: 12px;
    background: #d4edda;
    color: #155724;
    border-radius: 4px;
    text-align: center;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: #8e8e8e;
  }
`;
document.head.appendChild(styles);

// Render
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <OptionsApp />
    </React.StrictMode>
  );
}
