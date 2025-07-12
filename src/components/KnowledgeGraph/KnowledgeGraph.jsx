import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MockKnowledgeGraphGenerator } from '../../services/knowledgeGraph/mockDataGenerator';
import { hybridGraphGenerator } from '../../services/knowledgeGraph/hybridGraphGenerator';
import { vectorRAGService } from '../../services/knowledgeGraph/vectorRAGService';
import { VectorDatabaseTester } from '../VectorDatabaseTester';
import * as d3 from 'd3-force';
import { useGraphControls } from './hooks/useGraphControls';
import { useGraphRealtime } from './hooks/useGraphRealtime';
import { useGraphPerformance } from './hooks/useGraphPerformance';
import { GraphControls } from './components/GraphControls';
import { NodeDetails } from './components/NodeDetails';
import { DragPreview } from './components/DragPreview';
import { GraphLoadingState } from './components/GraphLoadingState';
import { GraphErrorBoundary } from './components/GraphErrorBoundary';
import './KnowledgeGraph.css';

// Polyfill for roundRect if not available
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + width, y, x + width, y + height, radius);
    this.arcTo(x + width, y + height, x, y + height, radius);
    this.arcTo(x, y + height, x, y, radius);
    this.arcTo(x, y, x + width, y, radius);
    this.closePath();
  };
}

export function KnowledgeGraph({ 
  documents = [], 
  viewMode = 'both',
  accountId = null,
  showPerformanceMetrics = false,
  enableRealtime = false,
  height = 600,
  isDragging = false,
  onFileSelect = null
}) {
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState(new Set());
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [physicsEnabled, setPhysicsEnabled] = useState(true);
  const [filterTags, setFilterTags] = useState([]);
  const [ragData, setRagData] = useState(null);
  const [showVectorTester, setShowVectorTester] = useState(false);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.5); // Dynamic threshold
  
  const graphRef = useRef();
  const containerRef = useRef();
  
  // Custom hooks
  const { 
    zoomToFit, 
    centerGraph, 
    resetGraph, 
    takeScreenshot 
  } = useGraphControls(graphRef);
  
  // Initialize realtime connection if enabled
  useGraphRealtime(enableRealtime, graphData);
  
  const { 
    performanceMetrics 
  } = useGraphPerformance(graphRef, showPerformanceMetrics);

  // Filter documents based on view mode
  const filteredDocuments = useMemo(() => {
    // Filter documents based on view mode
    const filteredDocs = documents.filter(doc => {
      if (viewMode === 'global') return doc.is_global === true;
      if (viewMode === 'account') return !doc.is_global;
      return true; // 'both'
    });
    
    // Apply search filter
    if (searchTerm.trim()) {
      return filteredDocs.filter(doc => 
        doc.file_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.content?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return filteredDocs;
  }, [documents, viewMode, searchTerm]);

  // Generate graph data
  const generateGraphData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (filteredDocuments.length === 0) {
        setGraphData({ nodes: [], links: [] });
        return;
      }

      // Use hybrid graph generation
      console.log('🧬 Generating hybrid graph...');
      
      try {
        // Update the threshold before generating relationships
        vectorRAGService.similarityThreshold = similarityThreshold;
        
        // Get RAG relationships
        const relationships = await vectorRAGService.generateDocumentRelationships(
          accountId === 'global' ? null : accountId
        );
        
        setRagData(relationships);
        
        // Generate hybrid graph with both baseline and RAG connections
        const graphData = hybridGraphGenerator.generate(filteredDocuments, relationships);
        
        setGraphData(graphData);
        
      } catch (ragError) {
        console.error('❌ Hybrid graph generation failed:', ragError);
        console.error('Falling back to mock data.');
        
        // Fall back to mock data on error
        const mockGenerator = new MockKnowledgeGraphGenerator(filteredDocuments);
        const mockData = mockGenerator.generateMockGraph();
        setGraphData(mockData);
      }
      
      // Generate filter tags
      const uniqueTypes = [...new Set(filteredDocuments.map(n => n.file_type || 'unknown'))];
      const tags = uniqueTypes.map(type => ({
        name: type,
        count: filteredDocuments.filter(n => n.file_type === type).length,
        active: false
      }));
      setFilterTags(tags);
      
    } catch (err) {
      console.error('Error generating graph data:', err);
      setError(`Failed to generate graph: ${err.message}`);
      
      // Fallback to mock data
      const generator = new MockKnowledgeGraphGenerator(filteredDocuments);
      const mockData = generator.generateMockGraph();
      setGraphData(mockData);
      
    } finally {
      setLoading(false);
    }
  }, [filteredDocuments, accountId, similarityThreshold]);

  // Call generateGraphData when dependencies change
  useEffect(() => {
    generateGraphData();
  }, [generateGraphData]);

  // Node event handlers
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleNodeHover = useCallback((node) => {
    const highlights = new Set();
    const linkHighlights = new Set();
    
    if (node) {
      highlights.add(node.id);
      
      // Highlight connected nodes
      graphData.links.forEach(link => {
        if (link.source === node.id || link.source.id === node.id) {
          highlights.add(typeof link.target === 'object' ? link.target.id : link.target);
          linkHighlights.add(link);
        }
        if (link.target === node.id || link.target.id === node.id) {
          highlights.add(typeof link.source === 'object' ? link.source.id : link.source);
          linkHighlights.add(link);
        }
      });
    }
    
    setHighlightedNodes(highlights);
    setHighlightedLinks(linkHighlights);
  }, [graphData.links]);

  // Control handlers
  const handleFilterChange = useCallback((tagName) => {
    setFilterTags(prev => 
      prev.map(tag => 
        tag.name === tagName 
          ? { ...tag, active: !tag.active }
          : tag
      )
    );
  }, []);

  const handleTogglePhysics = useCallback(() => {
    setPhysicsEnabled(prev => !prev);
    if (graphRef.current) {
      if (physicsEnabled) {
        graphRef.current.d3Force('charge', null);
        graphRef.current.d3Force('link', null);
      } else {
        graphRef.current.d3ReheatSimulation();
      }
    }
  }, [physicsEnabled]);

  // Node rendering
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const label = node.name || node.id;
    const fontSize = Math.max(10, 12 / globalScale);
    const nodeRadius = Math.max(6, 8 / globalScale);
    
    // Use the color from the node's visual properties (set by file type)
    let nodeColor = node.visual?.color || '#3b82f6';
    let borderColor = nodeColor;
    
    // Adjust colors based on highlight state
    if (highlightedNodes.has(node.id)) {
      // Keep original file type color, just change border to cyan
      borderColor = '#06b6d4'; // Bright cyan border for highlighted
    } else if (highlightedNodes.size > 0) {
      // Fade non-highlighted nodes but keep some color
      const originalColor = nodeColor;
      nodeColor = originalColor + '80'; // Add alpha for transparency
      borderColor = '#475569';
    }
    
    // Draw node with a subtle glow
    ctx.save();
    
    // Glow effect for better visibility
    ctx.shadowColor = nodeColor;
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Draw main node
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI);
    ctx.fillStyle = nodeColor;
    ctx.fill();
    
    // Draw border
    ctx.shadowBlur = 0; // Remove shadow for border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = highlightedNodes.has(node.id) ? 3 : 2;
    ctx.stroke();
    
    // Draw icon if available
    if (node.visual?.icon && globalScale > 0.8) {
      ctx.font = `${Math.max(12, nodeRadius)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 0;
      ctx.fillText(node.visual.icon, node.x, node.y);
    }
    
    // Draw label if zoomed in enough
    if (globalScale > 1.2) {
      ctx.font = `${fontSize}px Sans-Serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillStyle = '#e2e8f0';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      const labelY = node.y + nodeRadius + 4;
      
      // Truncate long labels
      const maxLength = 20;
      const displayLabel = label.length > maxLength ? label.substring(0, maxLength) + '...' : label;
      ctx.fillText(displayLabel, node.x, labelY);
    }
    
    ctx.restore();
  }, [highlightedNodes]);

  // Configure force simulation for better spacing
  useEffect(() => {
    if (graphRef.current) {
      const graph = graphRef.current;
      
      // Configure forces for better node spacing
      graph.d3Force('link')
        .distance(link => {
          // Variable distance based on link type
          if (link.type === 'rag') {
            return link.strength === 'strong' ? 50 : 
                   link.strength === 'medium' ? 80 : 100;
          }
          return 150; // Baseline connections are longer
        })
        .strength(link => {
          // Variable strength based on link type
          if (link.type === 'rag') {
            return link.strength === 'strong' ? 0.8 : 
                   link.strength === 'medium' ? 0.5 : 0.3;
          }
          return 0.1; // Baseline connections are weaker
        });
        
      graph.d3Force('charge')
        .strength(-300); // Moderate repulsion between nodes
        
      graph.d3Force('center')
        .strength(0.05); // Very weak centering force
        
      // Add collision detection to prevent overlaps
      graph.d3Force('collide', d3.forceCollide()
        .radius(25) // Minimum distance between nodes
        .strength(0.7)
      );
    }
  }, [graphData, physicsEnabled]);

  // Link rendering
  const linkCanvasObject = useCallback((link, ctx) => {
    const start = link.source;
    const end = link.target;
    
    if (typeof start !== 'object' || typeof end !== 'object') return;
    
    const isHighlighted = highlightedLinks.has(link);
    const linkType = link.type || 'baseline';
    const strength = link.strength || 'weak';
    
    // Visual properties based on link type and strength
    let opacity, lineWidth, color, dashPattern;
    
    if (isHighlighted) {
      opacity = 1;
      lineWidth = 4;
      color = '#06b6d4'; // Bright cyan for highlighted
      dashPattern = [];
    } else if (highlightedLinks.size > 0) {
      opacity = 0.05; // Very faded when others are highlighted
      lineWidth = 1;
      color = '#64748b';
      dashPattern = [];
    } else {
      // Normal state - different styles for different types
      if (linkType === 'rag') {
        // RAG connections - solid lines
        dashPattern = [];
        switch (strength) {
          case 'strong':
            opacity = 0.9;
            lineWidth = 3;
            color = '#10b981'; // Strong = green
            break;
          case 'medium':
            opacity = 0.7;
            lineWidth = 2;
            color = '#3b82f6'; // Medium = blue
            break;
          case 'weak':
            opacity = 0.5;
            lineWidth = 1.5;
            color = '#8b5cf6'; // Weak = purple
            break;
          default:
            opacity = 0.3;
            lineWidth = 1;
            color = '#6b7280'; // Very weak = gray
        }
      } else {
        // Baseline connections - dashed lines
        opacity = 0.2;
        lineWidth = 1;
        color = '#94a3b8';
        dashPattern = [2, 4]; // Dashed pattern
        
        if (strength === 'very-weak' || linkType === 'minimum') {
          dashPattern = [1, 5]; // More sparse dashing
          opacity = 0.1;
        }
      }
    }
    
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    
    // Set dash pattern
    ctx.setLineDash(dashPattern);
    
    // Add subtle glow for strong RAG relationships
    if (linkType === 'rag' && strength === 'strong' && !highlightedLinks.size) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 3;
    }
    
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    // Reset dash pattern
    ctx.setLineDash([]);
    
    ctx.restore();
  }, [highlightedLinks]);

  if (loading) {
    return (
      <GraphLoadingState 
        message="Generating knowledge graph..." 
        progress={75}
      />
    );
  }

  if (error) {
    return (
      <GraphErrorBoundary 
        error={new Error(error)} 
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <GraphErrorBoundary>
      <div 
        ref={containerRef}
        className={`knowledge-graph-container ${isDragging ? 'dragging' : ''}`}
        style={{ height: `${height}px` }}
      >
        {/* Controls */}
        <div className="absolute top-4 left-4 z-10">
          {/* Graph Controls */}
          <GraphControls
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            physicsEnabled={physicsEnabled}
            onPhysicsToggle={handleTogglePhysics}
            filterTags={filterTags}
            onFilterChange={handleFilterChange}
            onZoomFit={zoomToFit}
            onCenter={centerGraph}
            onReset={resetGraph}
            onScreenshot={takeScreenshot}
            performanceMetrics={performanceMetrics}
            // RAG Controls
            useRAG={true} // Always true for hybrid mode
            ragData={ragData}
            onShowVectorTester={() => setShowVectorTester(!showVectorTester)}
            showVectorTester={showVectorTester}
            similarityThreshold={similarityThreshold}
            onSimilarityThresholdChange={setSimilarityThreshold}
          />
          
          {/* Vector Database Tester */}
          {showVectorTester && (
            <div className="vector-tester-overlay">
              <VectorDatabaseTester accountId={accountId} />
              <button 
                onClick={() => setShowVectorTester(false)}
                className="close-tester-btn"
              >
                Close Tester
              </button>
            </div>
          )}
        </div>

        {/* Graph */}
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={containerRef.current?.offsetWidth}
          height={height}
          nodeCanvasObject={nodeCanvasObject}
          linkCanvasObject={linkCanvasObject}
          onNodeClick={handleNodeClick}
          onNodeHover={handleNodeHover}
          linkLabel={link => link.label || ''}
          linkHoverPrecision={10}
          backgroundColor="transparent"
          enableNodeDrag={true}
          enablePanInteraction={true}
          enableZoomInteraction={true}
          cooldownTicks={physicsEnabled ? 100 : 0}
          d3AlphaDecay={physicsEnabled ? 0.02 : 1}
          d3VelocityDecay={physicsEnabled ? 0.1 : 1}
        />

        {/* Node Details */}
        {selectedNode && (
          <div className="absolute top-4 right-4 z-10">
            <NodeDetails
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              relatedNodes={graphData.nodes.filter(n => 
                graphData.links.some(link => 
                  (link.source === selectedNode.id || link.source.id === selectedNode.id) &&
                  (link.target === n.id || link.target.id === n.id)
                )
              )}
            />
          </div>
        )}

        {/* Drag Preview */}
        {isDragging && onFileSelect && (
          <DragPreview
            onFileSelect={onFileSelect}
            documents={filteredDocuments}
          />
        )}
      </div>
    </GraphErrorBoundary>
  );
} 