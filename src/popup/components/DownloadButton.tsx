/**
 * Download Button Component
 */

import React from 'react';

interface DownloadButtonProps {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function DownloadButton({
  onClick,
  disabled = false,
  loading = false,
  children,
  variant = 'primary',
}: DownloadButtonProps): JSX.Element {
  return (
    <button
      className={`download-btn ${variant} ${loading ? 'loading' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="spinner" />
      ) : (
        <DownloadIcon />
      )}
      <span className="btn-text">{children}</span>
    </button>
  );
}

function DownloadIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
