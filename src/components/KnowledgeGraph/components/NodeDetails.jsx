import React from 'react';

// Helper to format filenames for display
const formatDisplayName = (name) => {
  return name
    .replace(/^TEMPLATE_/, '')
    .replace(/_/g, ' ')
    .replace(/\.(md|txt|pdf|docx?)$/i, '')
    .split('/')
    .pop(); // Get just the filename if it's a path
};

export const NodeDetails = ({ node, onClose, relatedNodes = [] }) => {
  if (!node) return null;

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const displayName = formatDisplayName(node.name);

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
          <span style={{ fontSize: '16px', fontWeight: '500' }}>{displayName}</span>
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
            <span className="metadata-value" style={{ textTransform: 'capitalize' }}>
              {node.type || 'document'}
            </span>
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
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Tags</h4>
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
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Summary</h4>
            <p style={{ fontSize: '13px', lineHeight: '1.5' }}>{node.metadata.summary}</p>
          </div>
        )}

        {relatedNodes.length > 0 && (
          <div className="related-nodes">
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
              Related Documents ({relatedNodes.length})
            </h4>
            <div className="related-nodes-list">
              {relatedNodes.slice(0, 5).map((relatedNode) => (
                <div key={relatedNode.id} className="related-node">
                  <span className="related-node-icon" style={{ fontSize: '16px' }}>
                    {relatedNode.visual?.icon || '📄'}
                  </span>
                  <div className="related-node-info">
                    <span className="related-node-name" style={{ fontSize: '13px' }}>
                      {formatDisplayName(relatedNode.name)}
                    </span>
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