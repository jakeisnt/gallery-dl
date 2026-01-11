/**
 * Media Grid Component
 * Displays extracted media in a grid layout
 */

import React from 'react';
import type { ExtractedMedia } from '../../types/instagram';

interface MediaGridProps {
  media: ExtractedMedia[];
  onDownload: (item: ExtractedMedia) => void;
}

export function MediaGrid({ media, onDownload }: MediaGridProps): JSX.Element {
  if (media.length === 0) {
    return (
      <div className="media-empty">
        <p>No media found on this page</p>
      </div>
    );
  }

  return (
    <div className="media-grid">
      {media.map((item, index) => (
        <MediaItem
          key={`${item.url}-${index}`}
          media={item}
          onDownload={() => onDownload(item)}
        />
      ))}
    </div>
  );
}

interface MediaItemProps {
  media: ExtractedMedia;
  onDownload: () => void;
}

function MediaItem({ media, onDownload }: MediaItemProps): JSX.Element {
  const isVideo = media.type === 'video';

  return (
    <div className="media-item" onClick={onDownload}>
      <div className="media-thumbnail">
        {isVideo ? (
          <div className="video-placeholder">
            <VideoIcon />
          </div>
        ) : (
          <img
            src={media.url}
            alt={media.filename}
            loading="lazy"
          />
        )}
        <div className="media-overlay">
          <DownloadIcon />
        </div>
      </div>
      <div className="media-info">
        <span className="media-type">{isVideo ? 'Video' : 'Image'}</span>
        {media.metadata.carouselIndex && (
          <span className="media-index">#{media.metadata.carouselIndex}</span>
        )}
      </div>
    </div>
  );
}

function VideoIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function DownloadIcon(): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
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
