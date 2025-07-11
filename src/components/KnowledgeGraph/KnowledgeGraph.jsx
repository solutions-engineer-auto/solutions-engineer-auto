import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MockKnowledgeGraphGenerator } from '../../services/knowledgeGraph/mockDataGenerator';
import { knowledgeStorage } from '../../utils/knowledgeStorage';
import { useGraphControls } from './hooks/useGraphControls';
import { useGraphRealtime } from './hooks/useGraphRealtime';
import { useGraphPerformance } from './hooks/useGraphPerformance';
import { GraphControls } from './components/GraphControls';
import { NodeDetails } from './components/NodeDetails';
import { DragPreview } from './components/DragPreview';
import { GraphLoadingState } from './components/GraphLoadingState';
import { GraphErrorBoundary } from './components/GraphErrorBoundary';
import './KnowledgeGraph.css';

// Memoized color utilities to prevent recreating on each render
const colorCache = new Map();

function darkenColor(color, percent) {
  const key = `${color}-dark-${percent}`;
  if (colorCache.has(key)) return colorCache.get(key);
  
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  const result = '#' + (0x1000000 + (R > 0 ? R : 0) * 0x10000 +
    (G > 0 ? G : 0) * 0x100 +
    (B > 0 ? B : 0)).toString(16).slice(1);
  
  colorCache.set(key, result);
  return result;
}

export const KnowledgeGraph = ({
  accountId,
  documents = [],
  viewMode = 'account',
  height = 600,
  showControls = true,
  showUpload = true,
  onNodeClick,
  onFileDrop,
  className = ''
}) => {
  // Consolidated state using reducer pattern for better performance
  const [state, setState] = useState({
    graphData: { nodes: [], links: [] },
    loading: true,
    error: null,
    hoveredNode: null,
    selectedNode: null,
    draggedFile: null,
    previewConnections: [],
    searchQuery: '',
    filterTags: [],
    highlightedNodes: new Set(),
    animatingNodes: new Set()
  });

  // Update specific state properties
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Refs
  const graphRef = useRef();
  const containerRef = useRef(null);
  const dragCounter = useRef(0);
  const hoverTimeoutRef = useRef(null);
  const cleanupRef = useRef([]);
  
  // Custom Hooks
  const controls = useGraphControls(graphRef);
  const accessedNodes = useGraphRealtime(accountId);
  const performanceMetrics = useGraphPerformance(state.graphData);
  
  // Initialize graph data
  useEffect(() => {
    let cancelled = false;
    
    const initializeGraph = async () => {
      try {
        updateState({ loading: true, error: null });
        
        // Filter documents based on view mode using frontend storage
        const filteredDocs = documents.filter(doc => {
          const isGlobal = knowledgeStorage.isGlobal(doc.id);
          if (viewMode === 'global') return isGlobal;
          if (viewMode === 'account') return !isGlobal;
          return true; // 'both'
        });
        
        // Generate graph data
        const generator = new MockKnowledgeGraphGenerator(filteredDocs);
        const data = generator.generateMockGraph();
        
        if (!cancelled) {
          updateState({ 
            graphData: data,
            loading: false 
          });
        }
      } catch (err) {
        if (!cancelled) {
          updateState({ 
            error: err instanceof Error ? err : new Error('Failed to initialize graph'),
            loading: false 
          });
        }
      }
    };
    
    initializeGraph();
    
    return () => {
      cancelled = true;
    };
  }, [documents, viewMode, accountId, updateState]);
  
  // Real-time AI document access animation
  useEffect(() => {
    if (accessedNodes.size > 0) {
      updateState({ animatingNodes: new Set(accessedNodes) });
      
      // Clear animation after duration
      const timeout = setTimeout(() => {
        updateState({ animatingNodes: new Set() });
      }, 3000);
      
      cleanupRef.current.push(() => clearTimeout(timeout));
    }
  }, [accessedNodes, updateState]);
  
  // Cleanup function
  useEffect(() => {
    return () => {
      cleanupRef.current.forEach(cleanup => cleanup());
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);
  
  // Smooth node highlighting on hover
  const handleNodeHover = useCallback((node) => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (node) {
      // Delay hover effect slightly for smoother interaction
      hoverTimeoutRef.current = setTimeout(() => {
        const connected = new Set([node.id]);
        state.graphData.links.forEach(link => {
          const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
          const targetId = typeof link.target === 'string' ? link.target : link.target.id;
          
          if (sourceId === node.id) connected.add(targetId);
          if (targetId === node.id) connected.add(sourceId);
        });
        
        updateState({ 
          hoveredNode: node,
          highlightedNodes: connected 
        });
      }, 50);
    } else {
      updateState({ 
        hoveredNode: null,
        highlightedNodes: new Set() 
      });
    }
    
    document.body.style.cursor = node ? 'pointer' : 'default';
  }, [state.graphData.links, updateState]);
  
  // Handle node click with smooth animation
  const handleNodeClick = useCallback((node) => {
    updateState({ selectedNode: node });
    
    if (onNodeClick) {
      onNodeClick(node);
    }
    
    // Smooth zoom to node
    if (graphRef.current) {
      graphRef.current.centerAt(node.x, node.y, 1000);
      graphRef.current.zoom(3, 1000);
    }
    
    // Analytics
    if (window.gtag) {
      window.gtag('event', 'knowledge_graph_node_click', {
        node_id: node.id,
        node_type: node.type,
        account_id: accountId
      });
    }
  }, [onNodeClick, accountId, updateState]);
  
  // Memoized node rendering to prevent recreation
  const nodeCanvasObject = useMemo(() => {
    return (node, ctx, globalScale) => {
      const nodeSize = (node.visual?.size || 10) / 2;
      const isHighlighted = state.highlightedNodes.has(node.id);
      const isAnimating = state.animatingNodes.has(node.id);
      const isHovered = state.hoveredNode?.id === node.id;
      
      // Save context state
      ctx.save();
      
      // Apply opacity based on highlight state
      if (state.highlightedNodes.size > 0 && !isHighlighted) {
        ctx.globalAlpha = 0.2;
      }
      
      // Draw outer glow for animated or hovered nodes
      if (isAnimating || isHovered) {
        const glowSize = isAnimating ? nodeSize * 2.5 : nodeSize * 1.8;
        const gradient = ctx.createRadialGradient(node.x, node.y, nodeSize, node.x, node.y, glowSize);
        gradient.addColorStop(0, node.visual?.color || '#6b7280');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = isAnimating ? 0.6 : 0.3;
        ctx.beginPath();
        ctx.arc(node.x, node.y, glowSize, 0, 2 * Math.PI);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      
      // Draw node
      ctx.fillStyle = node.visual?.color || '#6b7280';
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw border
      ctx.strokeStyle = darkenColor(node.visual?.color || '#6b7280', 20);
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw icon
      ctx.font = `${nodeSize * 1.2}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'white';
      ctx.fillText(node.visual?.icon || '📄', node.x, node.y);
      
      // Draw label if zoomed in or hovered
      if (globalScale > 2 || isHovered) {
        const labelOpacity = isHovered ? 1 : Math.min((globalScale - 2) / 2, 1);
        ctx.globalAlpha = labelOpacity;
        
        // Label background
        ctx.font = '12px Arial';
        const textMetrics = ctx.measureText(node.name);
        const labelPadding = 4;
        const labelY = node.y + nodeSize + 15;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(
          node.x - textMetrics.width / 2 - labelPadding,
          labelY - 10,
          textMetrics.width + labelPadding * 2,
          16
        );
        
        // Label text
        ctx.fillStyle = 'white';
        ctx.fillText(node.name, node.x, labelY);
      }
      
      // Restore context
      ctx.restore();
    };
  }, [state.hoveredNode, state.highlightedNodes, state.animatingNodes]);
  
  // Memoized link rendering
  const linkCanvasObject = useMemo(() => {
    return (link, ctx) => {
      const start = link.source;
      const end = link.target;
      
      // Skip if nodes not visible
      if (!start.x || !end.x) return;
      
      const isHighlighted = state.highlightedNodes.has(start.id) && state.highlightedNodes.has(end.id);
      
      ctx.save();
      
      // Apply opacity
      ctx.globalAlpha = state.highlightedNodes.size > 0 
        ? (isHighlighted ? 0.8 : 0.1)
        : (link.value * 0.6);
      
      // Draw line
      ctx.strokeStyle = '#374151';
      ctx.lineWidth = Math.max(1, link.value * 3);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      
      ctx.restore();
    };
  }, [state.highlightedNodes]);
  
  // Filtered data for search
  const filteredGraphData = useMemo(() => {
    if (!state.searchQuery && state.filterTags.length === 0) {
      return state.graphData;
    }
    
    const query = state.searchQuery.toLowerCase();
    const filteredNodes = state.graphData.nodes.filter(node => {
      const matchesSearch = !query || 
        node.name.toLowerCase().includes(query) ||
        node.metadata?.summary?.toLowerCase().includes(query) ||
        node.metadata?.tags?.some(tag => tag.toLowerCase().includes(query));
      
      const matchesTags = state.filterTags.length === 0 ||
        state.filterTags.every(tag => node.metadata?.tags?.includes(tag));
      
      return matchesSearch && matchesTags;
    });
    
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = state.graphData.links.filter(link => {
      const sourceId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetId = typeof link.target === 'string' ? link.target : link.target.id;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });
    
    return { nodes: filteredNodes, links: filteredLinks };
  }, [state.graphData, state.searchQuery, state.filterTags]);
  
  // Drag and drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    dragCounter.current++;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const file = e.dataTransfer.items[0];
      if (file.kind === 'file') {
        const fileObj = file.getAsFile();
        
        // Calculate preview connections
        const connections = state.graphData.nodes
          .filter(n => n.type === 'document')
          .map(node => ({
            nodeId: node.id,
            node: node,
            similarity: 0.6 + Math.random() * 0.4
          }))
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 5);
        
        updateState({ 
          draggedFile: fileObj,
          previewConnections: connections 
        });
      }
    }
  }, [state.graphData.nodes, updateState]);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    dragCounter.current--;
    
    if (dragCounter.current === 0) {
      updateState({ 
        draggedFile: null,
        previewConnections: [] 
      });
    }
  }, [updateState]);
  
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    dragCounter.current = 0;
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFileDrop) {
      const file = files[0];
      
      try {
        await onFileDrop(file);
      } catch (error) {
        console.error('File upload failed:', error);
        if (window.showNotification) {
          window.showNotification('error', 'Failed to upload file. Please try again.');
        }
      }
    }
    
    updateState({ 
      draggedFile: null,
      previewConnections: [] 
    });
  }, [onFileDrop, updateState]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        updateState({ 
          selectedNode: null,
          hoveredNode: null,
          highlightedNodes: new Set() 
        });
      } else if (e.key === ' ' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        controls.resetView();
      } else if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const searchInput = document.getElementById('graph-search-input');
        if (searchInput) searchInput.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [controls, updateState]);

  // Handle global knowledge updates
  useEffect(() => {
    const handleGlobalUpdate = () => {
      // Force re-render when global knowledge changes
      updateState(prev => ({ ...prev }));
    };

    window.addEventListener('globalKnowledgeUpdated', handleGlobalUpdate);
    return () => window.removeEventListener('globalKnowledgeUpdated', handleGlobalUpdate);
  }, [updateState]);
  
  // Loading state
  if (state.loading) {
    return <GraphLoadingState height={height} />;
  }
  
  // Error state
  if (state.error) {
    return (
      <div className={`knowledge-graph-error ${className}`} style={{ height }}>
        <div className="error-content">
          <h3>Unable to Load Knowledge Graph</h3>
          <p>{state.error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-volcanic"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <GraphErrorBoundary>
      <div 
        ref={containerRef}
        className={`knowledge-graph-container ${className} ${state.draggedFile ? 'dragging' : ''}`}
        style={{ height }}
        onDragEnter={showUpload ? handleDragEnter : undefined}
        onDragOver={showUpload ? (e) => e.preventDefault() : undefined}
        onDragLeave={showUpload ? handleDragLeave : undefined}
        onDrop={showUpload ? handleDrop : undefined}
        role="application"
        aria-label="Interactive Knowledge Graph Visualization"
      >
        {/* Controls */}
        {showControls && (
          <GraphControls
            controls={controls}
            searchQuery={state.searchQuery}
            onSearchChange={(query) => updateState({ searchQuery: query })}
            filterTags={state.filterTags}
            onFilterTagsChange={(tags) => updateState({ filterTags: tags })}
            availableTags={Array.from(new Set(state.graphData.nodes.flatMap(n => n.metadata?.tags || [])))}
            performanceMetrics={performanceMetrics}
          />
        )}
        
        {/* Node Details Panel */}
        {state.selectedNode && (
          <NodeDetails
            node={state.selectedNode}
            onClose={() => updateState({ selectedNode: null })}
            relatedNodes={state.graphData.nodes.filter(n => {
              const links = state.graphData.links.filter(l => {
                const sourceId = typeof l.source === 'string' ? l.source : l.source.id;
                const targetId = typeof l.target === 'string' ? l.target : l.target.id;
                return (sourceId === state.selectedNode.id && targetId === n.id) ||
                       (targetId === state.selectedNode.id && sourceId === n.id);
              });
              return links.length > 0;
            })}
          />
        )}
        
        {/* Drag Preview */}
        {state.draggedFile && (
          <DragPreview
            file={state.draggedFile}
            connections={state.previewConnections}
          />
        )}
        
        {/* Graph Visualization */}
        <ForceGraph2D
          ref={graphRef}
          graphData={filteredGraphData}
          width={containerRef.current?.clientWidth || 800}
          height={height}
          nodeLabel={() => ''} // Disable default tooltip
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          onNodeDragEnd={(node) => {
            // Save position for persistence
            node.fx = node.x;
            node.fy = node.y;
          }}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          backgroundColor="rgba(0, 0, 0, 0)"
          // Performance optimizations
          warmupTicks={50}
          cooldownTicks={100}
          cooldownTime={3000}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>
    </GraphErrorBoundary>
  );
}; 