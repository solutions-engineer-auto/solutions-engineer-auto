import React from 'react';

export function GraphControls({ 
  searchTerm,
  onSearchChange,
  filterTags = [],
  onFilterChange,
  onZoomToFit,
  onCenter,
  onScreenshot,
  onTogglePhysics,
  physicsEnabled,
  onResetGraph,
  performanceMetrics,
  useRAG,
  similarityThreshold,
  onSimilarityThresholdChange,
  ragData,
  onShowVectorTester,
  showVectorTester
}) {
  return (
    <div className="glass-panel p-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search documents..."
          className="w-full pl-10 pr-4 py-2 bg-black/40 text-white rounded-lg border border-white/10 
                   focus:border-cyan-500/50 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none
                   placeholder-white/40"
        />
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onZoomToFit}
          className="btn-volcanic text-sm flex items-center justify-center space-x-2 py-2"
          title="Zoom to fit all nodes"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Fit</span>
        </button>
        
        <button
          onClick={onCenter}
          className="btn-volcanic text-sm flex items-center justify-center space-x-2 py-2"
          title="Center graph"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span>Center</span>
        </button>
        
        <button
          onClick={onScreenshot}
          className="btn-volcanic text-sm flex items-center justify-center space-x-2 py-2"
          title="Take screenshot"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Screenshot</span>
        </button>
        
        <button
          onClick={onResetGraph}
          className="btn-volcanic text-sm flex items-center justify-center space-x-2 py-2"
          title="Reset graph layout"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Reset</span>
        </button>
      </div>

      {/* Physics Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-white/70">Physics Simulation</span>
        <button
          onClick={onTogglePhysics}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            physicsEnabled 
              ? 'bg-gradient-to-r from-cyan-600 to-cyan-500' 
              : 'bg-white/10 border border-white/20'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
              physicsEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Filter Tags */}
      {filterTags && filterTags.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm text-white/70">Filter by type:</label>
          <div className="flex flex-wrap gap-1">
            {filterTags.map(tag => (
              <button
                key={tag.name}
                onClick={() => onFilterChange(tag.name)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  tag.active 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                }`}
              >
                {tag.name} ({tag.count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performanceMetrics && (
        <div className="pt-3 border-t border-white/10">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-white/50">
              <span className="block">FPS</span>
              <span className="text-cyan-400 font-mono">{performanceMetrics.fps}</span>
            </div>
            <div className="text-white/50">
              <span className="block">Nodes</span>
              <span className="text-cyan-400 font-mono">{performanceMetrics.nodeCount}</span>
            </div>
            <div className="text-white/50">
              <span className="block">Links</span>
              <span className="text-cyan-400 font-mono">{performanceMetrics.linkCount}</span>
            </div>
            <div className="text-white/50">
              <span className="block">Memory</span>
              <span className="text-cyan-400 font-mono">{performanceMetrics.memoryUsage}</span>
            </div>
          </div>
        </div>
      )}

      {/* RAG Controls */}
      {useRAG !== undefined && (
        <div className="space-y-3 mt-4 pt-4 border-t border-gray-700">
          {/* Connection Legend */}
          <div className="px-3 space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Connection Types</h4>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-green-500"></div>
                <span className="text-xs text-gray-400">Strong RAG (&gt;80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500"></div>
                <span className="text-xs text-gray-400">Medium RAG (60-80%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-purple-500"></div>
                <span className="text-xs text-gray-400">Weak RAG (40-60%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-gray-400 opacity-50" style={{ backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 2px, #9ca3af 2px, #9ca3af 4px)' }}></div>
                <span className="text-xs text-gray-400">Baseline</span>
              </div>
            </div>
          </div>
          
          {onSimilarityThresholdChange && (
            <div className="px-3 space-y-2 mt-4">
              <label className="text-xs text-gray-400 flex justify-between">
                <span>RAG Threshold</span>
                <span>{similarityThreshold?.toFixed(2) || '0.50'}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={similarityThreshold || 0.5}
                onChange={(e) => onSimilarityThresholdChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                         slider-thumb:bg-purple-500 slider-track:bg-purple-500/30"
              />
              <div className="text-xs text-gray-500">
                Lower = more RAG connections
              </div>
            </div>
          )}
          
          {ragData && (
            <div className="px-3 text-xs text-gray-400">
              <p>{ragData.length} RAG relationships found</p>
            </div>
          )}
          
          {onShowVectorTester && (
            <button
              onClick={onShowVectorTester}
              className="w-full text-left px-3 py-2 text-sm bg-blue-500/20 hover:bg-blue-500/30 
                       text-blue-200 rounded-md transition-colors"
            >
              {showVectorTester ? 'Hide' : 'Show'} Vector Tester
            </button>
          )}
        </div>
      )}
    </div>
  );
} 