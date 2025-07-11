import React from 'react';

export const GraphControls = ({ 
  controls, 
  searchQuery, 
  onSearchChange, 
  filterTags, 
  onFilterTagsChange,
  availableTags = [],
  performanceMetrics 
}) => {
  return (
    <div className="graph-controls glass-panel">
      <div className="controls-row">
        <button 
          className="control-button" 
          onClick={() => controls?.resetView?.()}
          title="Reset View (Space)"
        >
          <span className="icon">↻</span>
          Reset
        </button>
        <button 
          className="control-button" 
          onClick={() => controls?.zoomIn?.()}
          title="Zoom In"
        >
          <span className="icon">+</span>
        </button>
        <button 
          className="control-button" 
          onClick={() => controls?.zoomOut?.()}
          title="Zoom Out"
        >
          <span className="icon">−</span>
        </button>
      </div>

      <div className="search-box">
        <input
          id="graph-search-input"
          type="text"
          placeholder="Search nodes..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="search-input"
          aria-label="Search graph nodes"
        />
      </div>

      {availableTags.length > 0 && (
        <div className="filter-tags">
          {availableTags.map(tag => (
            <button
              key={tag}
              className={`filter-tag ${filterTags.includes(tag) ? 'active' : ''}`}
              onClick={() => {
                if (filterTags.includes(tag)) {
                  onFilterTagsChange(filterTags.filter(t => t !== tag));
                } else {
                  onFilterTagsChange([...filterTags, tag]);
                }
              }}
              aria-pressed={filterTags.includes(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {performanceMetrics && (
        <div className="performance-metrics">
          <span className="metric">
            FPS: <span className="value">{performanceMetrics.fps || 0}</span>
          </span>
          <span className="metric">
            Nodes: <span className="value">{performanceMetrics.nodeCount || 0}</span>
          </span>
        </div>
      )}
    </div>
  );
}; 