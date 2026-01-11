/**
 * Main Popup App Component
 */

import React from 'react';
import { useInstagram } from './hooks/useInstagram';
import { DownloadButton, ProgressBar, MediaGrid } from './components';
import './styles.css';

export function App(): JSX.Element {
  const [state, actions] = useInstagram();

  const {
    isLoggedIn,
    isLoading,
    error,
    currentUrl,
    media,
    downloadProgress,
  } = state;

  const {
    extractMedia,
    downloadAll,
    downloadSingle,
    clearError,
  } = actions;

  // Not logged in state
  if (!isLoggedIn && !isLoading) {
    return (
      <div className="popup-container">
        <Header />
        <div className="content">
          <div className="login-prompt">
            <LoginIcon />
            <h2>Not Logged In</h2>
            <p>Please log in to Instagram to use this extension.</p>
            <a
              href="https://www.instagram.com/accounts/login/"
              target="_blank"
              rel="noopener noreferrer"
              className="login-link"
            >
              Go to Instagram Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Check if on Instagram
  const isInstagram = currentUrl?.includes('instagram.com');

  return (
    <div className="popup-container">
      <Header />

      <div className="content">
        {/* Error message */}
        {error && (
          <div className="error-banner" onClick={clearError}>
            <span>{error}</span>
            <button className="close-btn">&times;</button>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="loading">
            <div className="spinner-large" />
            <p>Loading...</p>
          </div>
        )}

        {/* Not on Instagram */}
        {!isLoading && !isInstagram && (
          <div className="not-instagram">
            <InstagramIcon />
            <h2>Not on Instagram</h2>
            <p>Navigate to an Instagram page to download media.</p>
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="instagram-link"
            >
              Go to Instagram
            </a>
          </div>
        )}

        {/* Main content - on Instagram */}
        {!isLoading && isInstagram && (
          <>
            {/* Extract button */}
            {media.length === 0 && (
              <div className="extract-section">
                <p className="helper-text">
                  Click below to scan this page for downloadable media
                </p>
                <DownloadButton
                  onClick={extractMedia}
                  loading={isLoading}
                >
                  Scan for Media
                </DownloadButton>
              </div>
            )}

            {/* Media found */}
            {media.length > 0 && (
              <>
                <div className="media-header">
                  <h3>{media.length} item{media.length !== 1 ? 's' : ''} found</h3>
                  <DownloadButton
                    onClick={downloadAll}
                    disabled={downloadProgress.isDownloading}
                    loading={downloadProgress.isDownloading}
                  >
                    Download All
                  </DownloadButton>
                </div>

                {/* Download progress */}
                {downloadProgress.isDownloading && (
                  <ProgressBar
                    completed={downloadProgress.completed}
                    total={downloadProgress.total}
                    currentFile={downloadProgress.currentFile}
                  />
                )}

                {/* Media grid */}
                <MediaGrid
                  media={media}
                  onDownload={downloadSingle}
                />

                {/* Rescan button */}
                <div className="rescan-section">
                  <button
                    className="rescan-btn"
                    onClick={extractMedia}
                    disabled={isLoading}
                  >
                    Rescan Page
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}

function Header(): JSX.Element {
  return (
    <header className="header">
      <InstagramIcon />
      <h1>Instagram Downloader</h1>
      <button
        className="settings-btn"
        onClick={() => chrome.runtime.openOptionsPage()}
        title="Settings"
      >
        <SettingsIcon />
      </button>
    </header>
  );
}

function Footer(): JSX.Element {
  return (
    <footer className="footer">
      <span>v{chrome.runtime.getManifest().version}</span>
    </footer>
  );
}

function InstagramIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function LoginIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </svg>
  );
}

function SettingsIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
