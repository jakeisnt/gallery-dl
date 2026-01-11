/**
 * Progress Bar Component
 */

import React from 'react';

interface ProgressBarProps {
  completed: number;
  total: number;
  currentFile?: string;
}

export function ProgressBar({
  completed,
  total,
  currentFile,
}: ProgressBarProps): JSX.Element {
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="progress-container">
      <div className="progress-info">
        <span className="progress-text">
          {completed} / {total}
        </span>
        <span className="progress-percentage">{percentage}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {currentFile && (
        <div className="progress-current">
          Downloading: {currentFile}
        </div>
      )}
    </div>
  );
}
