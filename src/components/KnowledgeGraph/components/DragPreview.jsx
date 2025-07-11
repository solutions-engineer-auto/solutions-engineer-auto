import React from 'react';

export const DragPreview = ({ file, connections = [] }) => {
  if (!file) return null;

  return (
    <div className="drag-preview glass-panel">
      <h4>
        <span className="icon">📎</span>
        Dropping: {file.name}
      </h4>
      
      {connections.length > 0 && (
        <div className="preview-connections">
          <p className="preview-label">Will connect to:</p>
          {connections.map((connection) => (
            <div key={connection.nodeId} className="connection-preview">
              <span className="connection-icon">
                {connection.node?.visual?.icon || '📄'}
              </span>
              <span className="connection-name">
                {connection.node?.name || 'Unknown'}
              </span>
              <span className="connection-strength">
                {Math.round(connection.similarity * 100)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 