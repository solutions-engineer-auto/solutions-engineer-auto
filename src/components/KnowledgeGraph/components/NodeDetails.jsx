import React from 'react';

export function NodeDetails({ node, onClose, relatedNodes = [] }) {
  if (!node) return null;

  const getFileIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'pdf':
        return (
          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'txt':
      case 'md':
        return (
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="glass-panel p-6 max-w-sm animate-in fade-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-light text-white">Document Details</h3>
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          aria-label="Close details"
        >
          <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Document Info */}
      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          {getFileIcon(node.type)}
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-medium truncate">{node.name}</h4>
            <p className="text-sm text-white/60">{node.type?.toUpperCase() || 'Unknown'}</p>
          </div>
        </div>

        {/* Metadata */}
        <div className="space-y-3">
          {node.size && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Size</span>
              <span className="text-sm text-white">{node.size}</span>
            </div>
          )}
          
          {node.created && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Created</span>
              <span className="text-sm text-white">{new Date(node.created).toLocaleDateString()}</span>
            </div>
          )}
          
          {node.modified && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-white/60">Modified</span>
              <span className="text-sm text-white">{new Date(node.modified).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {node.tags && node.tags.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-white/60">Tags</span>
            <div className="flex flex-wrap gap-1">
              {node.tags.map(tag => (
                <span 
                  key={tag}
                  className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Documents */}
        {relatedNodes && relatedNodes.length > 0 && (
          <div className="space-y-2">
            <span className="text-sm text-white/60">Related Documents</span>
            <div className="space-y-2">
              {relatedNodes.slice(0, 3).map(related => (
                <div key={related.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    {getFileIcon(related.type)}
                    <span className="text-sm text-white truncate">{related.name}</span>
                  </div>
                  {related.similarity && (
                    <span className="text-xs text-cyan-400 font-mono">
                      {Math.round(related.similarity * 100)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-white/10 space-y-2">
          <button className="w-full btn-volcanic-primary text-sm py-2">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Document
          </button>
          
          <button className="w-full btn-volcanic text-sm py-2">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
            Show Relations
          </button>
        </div>
      </div>
    </div>
  );
} 