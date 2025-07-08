import React from 'react';

const ConnectionStatus = ({ mode, isConnected, lastError, threadId }) => {
  const getStatusColor = () => {
    if (lastError) return '#ff4444';
    if (!isConnected) return '#ffaa00';
    return '#44ff44';
  };

  const getStatusText = () => {
    if (mode === 'mock') return 'Mock Mode';
    if (lastError) return 'Connection Error';
    if (!isConnected) return 'Connecting...';
    return 'Connected';
  };

  return (
    <div className="connection-status">
      <div className="status-indicator">
        <span 
          className="status-dot"
          style={{ backgroundColor: getStatusColor() }}
        />
        <span className="status-text">{getStatusText()}</span>
      </div>
      {mode === 'agent' && (
        <div className="connection-details">
          {threadId && (
            <span className="thread-info">Thread: {threadId.slice(-8)}</span>
          )}
          {lastError && (
            <span className="error-info" title={lastError}>
              {lastError.length > 30 ? lastError.substring(0, 30) + '...' : lastError}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;