import React from 'react';

export const NodeDetails = ({ node, onClose, relatedNodes = [] }) => {
  if (!node) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="node-details glass-panel"
      role="dialog"
      aria-label="Node details"
      onKeyDown={handleKeyDown}
    >
      <div className="node-details-header">
        <h3 className="node-title">
          <span className="node-icon">{node.visual?.icon || '📄'}</span>
          {node.name}
        </h3>
        <button
          className="close-button"
          onClick={onClose}
          aria-label="Close details panel"
        >
          ×
        </button>
      </div>

      <div className="node-details-content">
        <div className="node-metadata">
          <div className="metadata-item">
            <span className="metadata-label">Type:</span>
            <span className="metadata-value">{node.type || 'Document'}</span>
          </div>
          {node.metadata?.uploadDate && (
            <div className="metadata-item">
              <span className="metadata-label">Uploaded:</span>
              <span className="metadata-value">
                {new Date(node.metadata.uploadDate).toLocaleDateString()}
              </span>
            </div>
          )}
          {node.metadata?.usageCount !== undefined && (
            <div className="metadata-item">
              <span className="metadata-label">Usage Count:</span>
              <span className="metadata-value">{node.metadata.usageCount}</span>
            </div>
          )}
          {node.metadata?.relevanceScore !== undefined && (
            <div className="metadata-item">
              <span className="metadata-label">Relevance:</span>
              <span className="metadata-value">
                {Math.round(node.metadata.relevanceScore * 100)}%
              </span>
            </div>
          )}
        </div>

        {node.metadata?.tags && node.metadata.tags.length > 0 && (
          <div className="node-tags">
            <h4>Tags</h4>
            <div className="tags-list">
              {node.metadata.tags.map((tag, index) => (
                <span key={index} className="node-tag">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {node.metadata?.summary && (
          <div className="node-summary">
            <h4>Summary</h4>
            <p>{node.metadata.summary}</p>
          </div>
        )}

        {relatedNodes.length > 0 && (
          <div className="related-nodes">
            <h4>Related Documents ({relatedNodes.length})</h4>
            <div className="related-nodes-list">
              {relatedNodes.slice(0, 5).map((relatedNode) => (
                <div key={relatedNode.id} className="related-node">
                  <span className="related-node-icon">
                    {relatedNode.visual?.icon || '📄'}
                  </span>
                  <div className="related-node-info">
                    <span className="related-node-name">{relatedNode.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 