import React from 'react';

export const GraphLoadingState = ({ height = 600 }) => {
  return (
    <div 
      className="knowledge-graph-loading"
      style={{ height }}
      role="status"
      aria-label="Loading knowledge graph"
    >
      <div className="loading-content">
        <div className="loading-spinner">
          <svg
            className="spinner-svg"
            width="60"
            height="60"
            viewBox="0 0 60 60"
            fill="none"
          >
            <circle
              className="spinner-track"
              cx="30"
              cy="30"
              r="25"
              stroke="currentColor"
              strokeWidth="4"
              opacity="0.2"
            />
            <circle
              className="spinner-fill"
              cx="30"
              cy="30"
              r="25"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="157"
              strokeDashoffset="39.25"
            />
          </svg>
        </div>
        <p className="loading-text">Loading Knowledge Graph...</p>
      </div>
    </div>
  );
}; 