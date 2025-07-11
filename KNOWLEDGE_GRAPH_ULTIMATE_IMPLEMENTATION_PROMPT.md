# 🧠 KNOWLEDGE GRAPH IMPLEMENTATION: FRONTEND-ONLY JAVASCRIPT v3.0

## ⚠️ CRITICAL: LESSONS LEARNED FROM FAILED IMPLEMENTATIONS

### ABSOLUTE REQUIREMENTS (NON-NEGOTIABLE):
1. **JavaScript ONLY** - NO TypeScript files (.js/.jsx only)
2. **2D ONLY** - Use react-force-graph-2d (NOT 3D - causes WebGPU errors)
3. **NO Supabase changes** - Frontend-only implementation
4. **NO direct node modifications** - Use React state for ALL interactions
5. **Install dependencies FIRST** - Prevents 404 errors

### WHAT WENT WRONG BEFORE:
- TypeScript interfaces in JavaScript project = build errors
- react-force-graph-3d + three.js = WebGPU compatibility nightmare
- Direct node property modification = graph freezing on hover
- Missing dependencies = 404 errors and broken app
- Database schema changes = backend complexity not needed

## YOUR IDENTITY

You are a **Senior Frontend Engineer** specializing in:
- React 18+ with JavaScript (NOT TypeScript)
- 2D data visualization (D3.js, Canvas, react-force-graph-2d)
- Performance optimization for 1000+ nodes
- Frontend-only architectures using localStorage/sessionStorage
- Creating "WOW" factor visualizations that impress enterprise clients

## IMPLEMENTATION REQUIREMENTS

### Technical Stack (EXACT VERSIONS)
```json
{
  "dependencies": {
    "react-force-graph-2d": "^1.23.0",
    "d3-force": "^3.0.0",
    "uuid": "^9.0.0"
  }
}
```

### Architecture Constraints
- **NO backend changes** - Work with existing Supabase schema
- **Frontend storage only** - localStorage for persistent data, sessionStorage for cache
- **Client-side processing** - All calculations in browser
- **Progressive enhancement** - Must work without Web Workers

## PHASE 1: INSTALL AND BASIC 2D GRAPH

### Task 1: Install Dependencies (DO THIS FIRST!)
```bash
npm install --save react-force-graph-2d@1.23.0 d3-force@3.0.0 uuid@9.0.0
```

### Task 2: Create Mock Data Generator (JavaScript)

Create `src/services/knowledgeGraph/mockDataGenerator.js`:

```javascript
// Mock data generator for Knowledge Graph visualization
// CRITICAL: This is JAVASCRIPT not TypeScript

import { v4 as uuidv4 } from 'uuid';

export class MockKnowledgeGraphGenerator {
  constructor(documents, seed = Date.now()) {
    this.documents = documents;
    this.rngSeed = seed;
  }

  // Seeded random for reproducible layouts
  seededRandom() {
    this.rngSeed = (this.rngSeed * 9301 + 49297) % 233280;
    return this.rngSeed / 233280;
  }

  generateMockGraph() {
    const nodes = this.createNodes();
    const links = this.createLinks(nodes);
    
    return { nodes, links };
  }

  createNodes() {
    return this.documents.map((doc, index) => ({
      id: doc.id || uuidv4(),
      name: doc.file_name,
      type: 'document',
      // DO NOT modify these properties directly during runtime!
      __nodeData: {
        fileType: doc.file_type,
        uploadDate: doc.created_at,
        accountId: doc.account_id,
        isGlobal: false, // We'll use frontend storage for this
        color: this.getColorByType(doc.file_type),
        size: 5 + Math.random() * 10
      }
    }));
  }

  createLinks(nodes) {
    const links = [];
    const maxLinks = Math.min(nodes.length * 2, 50);
    
    // Create some mock relationships
    for (let i = 0; i < nodes.length && links.length < maxLinks; i++) {
      const numConnections = Math.floor(this.seededRandom() * 3) + 1;
      
      for (let j = 0; j < numConnections; j++) {
        const targetIdx = Math.floor(this.seededRandom() * nodes.length);
        if (targetIdx !== i) {
          links.push({
            source: nodes[i].id,
            target: nodes[targetIdx].id,
            value: this.seededRandom()
          });
        }
      }
    }
    
    return links;
  }

  getColorByType(fileType) {
    const colors = {
      'application/pdf': '#ef4444',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#3b82f6',
      'text/plain': '#10b981',
      'text/markdown': '#8b5cf6',
      'application/json': '#f59e0b',
      'text/csv': '#059669'
    };
    
    return colors[fileType] || '#6b7280';
  }
}
```

### Task 3: Create the Main Knowledge Graph Component (2D ONLY)

Create `src/components/KnowledgeGraph/KnowledgeGraph.jsx`:

```javascript
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { MockKnowledgeGraphGenerator } from '../../services/knowledgeGraph/mockDataGenerator';
import { knowledgeStorage } from '../../utils/knowledgeStorage';
import './KnowledgeGraph.css';

const KnowledgeGraph = ({ 
  documents = [], 
  accountId, 
  viewMode = 'account',
  height = 600,
  width = 800,
  onNodeClick,
  onFileDrop,
  className = ''
}) => {
  // CRITICAL: Use React state for ALL interactive properties
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dimensions, setDimensions] = useState({ width, height });
  
  const graphRef = useRef();
  const containerRef = useRef();
  
  // Generate graph data
  useEffect(() => {
    if (documents.length === 0) return;
    
    // Filter based on view mode using frontend storage
    const filteredDocs = documents.filter(doc => {
      const isGlobal = knowledgeStorage.isGlobal(doc.id);
      if (viewMode === 'global') return isGlobal;
      if (viewMode === 'account') return !isGlobal;
      return true; // 'both'
    });
    
    const generator = new MockKnowledgeGraphGenerator(filteredDocs, accountId?.charCodeAt(0));
    const data = generator.generateMockGraph();
    setGraphData(data);
  }, [documents, viewMode, accountId]);
  
  // CRITICAL: Handle node hover WITHOUT modifying node properties
  const handleNodeHover = useCallback((node) => {
    setHighlightedNodeId(node ? node.id : null);
  }, []);
  
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);
  
  // Custom node rendering with state-based styling
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHighlighted = node.id === highlightedNodeId;
    const nodeData = node.__nodeData || {};
    
    // Draw node circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeData.size || 5, 0, 2 * Math.PI);
    ctx.fillStyle = isHighlighted 
      ? '#3b82f6' 
      : (nodeData.color || '#6b7280');
    ctx.fill();
    
    // Draw highlight ring if highlighted
    if (isHighlighted) {
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Draw label
    if (globalScale > 0.5) {
      ctx.font = `${12/globalScale}px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(node.name, node.x, node.y - (nodeData.size || 5) - 2);
    }
  }, [highlightedNodeId]);
  
  // Handle file drop
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0 && onFileDrop) {
      await onFileDrop(files[0]);
    }
  }, [onFileDrop]);
  
  // Responsive sizing
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: height
        });
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height]);
  
  return (
    <div className={`knowledge-graph-wrapper ${className}`}>
      <div 
        ref={containerRef}
        className={`knowledge-graph-container ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={dimensions.width}
          height={dimensions.height}
          nodeCanvasObject={nodeCanvasObject}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          backgroundColor="#0a0f1e"
          linkColor={() => '#374151'}
          linkOpacity={0.3}
          linkWidth={1}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
        
        {/* Overlay UI Elements */}
        {selectedNode && (
          <NodeDetailsPanel 
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            onMarkAsGlobal={(nodeId) => {
              knowledgeStorage.markAsGlobal(nodeId);
              // Trigger re-render
              setGraphData({ ...graphData });
            }}
          />
        )}
        
        {isDragging && (
          <div className="drop-overlay">
            <div className="drop-message">
              Drop file to add to knowledge graph
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Node details panel component
const NodeDetailsPanel = ({ node, onClose, onMarkAsGlobal }) => {
  const nodeData = node.__nodeData || {};
  const isGlobal = knowledgeStorage.isGlobal(node.id);
  
  return (
    <div className="node-details-panel glass-panel">
      <button className="close-btn" onClick={onClose}>×</button>
      <h3>{node.name}</h3>
      <div className="node-info">
        <p>Type: {nodeData.fileType || 'Unknown'}</p>
        <p>Uploaded: {new Date(nodeData.uploadDate).toLocaleDateString()}</p>
        <p>Status: {isGlobal ? '🌐 Global' : '📁 Account-specific'}</p>
      </div>
      {!isGlobal && (
        <button 
          className="mark-global-btn"
          onClick={() => onMarkAsGlobal(node.id)}
        >
          Mark as Global Knowledge
        </button>
      )}
    </div>
  );
};

export default KnowledgeGraph;
```

### Task 4: Create Frontend Storage Service

Create `src/utils/knowledgeStorage.js`:

```javascript
// Frontend-only storage for global knowledge markers
const GLOBAL_KNOWLEDGE_KEY = 'se_auto_global_knowledge';

export const knowledgeStorage = {
  // Mark document as global
  markAsGlobal(documentId) {
    const globals = this.getGlobalDocuments();
    if (!globals.includes(documentId)) {
      globals.push(documentId);
      localStorage.setItem(GLOBAL_KNOWLEDGE_KEY, JSON.stringify(globals));
    }
  },
  
  // Get all global document IDs
  getGlobalDocuments() {
    try {
      const stored = localStorage.getItem(GLOBAL_KNOWLEDGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading global documents:', e);
      return [];
    }
  },
  
  // Check if document is marked as global
  isGlobal(documentId) {
    return this.getGlobalDocuments().includes(documentId);
  },
  
  // Remove global marker
  unmarkAsGlobal(documentId) {
    const globals = this.getGlobalDocuments();
    const filtered = globals.filter(id => id !== documentId);
    localStorage.setItem(GLOBAL_KNOWLEDGE_KEY, JSON.stringify(filtered));
  }
};
```

### Task 5: Create Stunning CSS Styles

Create `src/components/KnowledgeGraph/KnowledgeGraph.css`:

```css
/* Knowledge Graph Styles - Premium glassmorphic design */
.knowledge-graph-wrapper {
  position: relative;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(10, 15, 30, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.2);
  box-shadow: 
    0 0 40px rgba(59, 130, 246, 0.1),
    inset 0 0 20px rgba(10, 15, 30, 0.5);
}

.knowledge-graph-container {
  position: relative;
  width: 100%;
  transition: all 0.3s ease;
}

.knowledge-graph-container.dragging {
  border: 2px dashed #3b82f6;
  background: rgba(59, 130, 246, 0.05);
}

/* Node details panel */
.node-details-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  padding: 20px;
  background: rgba(17, 24, 39, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  color: white;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.node-details-panel h3 {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #60a5fa;
}

.node-details-panel .close-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 24px;
  cursor: pointer;
  transition: color 0.2s;
}

.node-details-panel .close-btn:hover {
  color: #ef4444;
}

.node-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #d1d5db;
}

.mark-global-btn {
  margin-top: 16px;
  width: 100%;
  padding: 8px 16px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border: none;
  border-radius: 8px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.mark-global-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* Drop overlay */
.drop-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(59, 130, 246, 0.1);
  backdrop-filter: blur(4px);
  pointer-events: none;
}

.drop-message {
  padding: 20px 40px;
  background: rgba(59, 130, 246, 0.9);
  color: white;
  font-size: 18px;
  font-weight: 500;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
}

/* Graph controls */
.graph-controls {
  position: absolute;
  bottom: 20px;
  left: 20px;
  display: flex;
  gap: 8px;
  z-index: 10;
}

.graph-control-btn {
  padding: 8px 12px;
  background: rgba(17, 24, 39, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 8px;
  color: #d1d5db;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.graph-control-btn:hover {
  background: rgba(59, 130, 246, 0.2);
  border-color: #3b82f6;
  color: white;
}

/* Loading state */
.graph-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
  color: #60a5fa;
  font-size: 18px;
}

.graph-loading::after {
  content: '';
  display: inline-block;
  width: 20px;
  height: 20px;
  margin-left: 10px;
  border: 2px solid #60a5fa;
  border-radius: 50%;
  border-top-color: transparent;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
```

### Task 6: Integrate into ProspectDetailPage

Update `src/pages/ProspectDetailPage.jsx`:

```javascript
// Add imports
import React, { lazy, Suspense } from 'react';
const KnowledgeGraph = lazy(() => import('../components/KnowledgeGraph/KnowledgeGraph'));

// Add state for view mode
const [viewMode, setViewMode] = useState(() => {
  return localStorage.getItem(`viewMode_${id}`) || 'list';
});

// Update view mode and persist
const handleViewModeChange = (mode) => {
  setViewMode(mode);
  localStorage.setItem(`viewMode_${id}`, mode);
};

// Add view toggle buttons
<div className="view-controls">
  <button 
    className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
    onClick={() => handleViewModeChange('list')}
  >
    <span>📋</span> List View
  </button>
  <button 
    className={`view-btn ${viewMode === 'graph' ? 'active' : ''}`}
    onClick={() => handleViewModeChange('graph')}
  >
    <span>🧠</span> Graph View
  </button>
</div>

// Render based on view mode
{viewMode === 'graph' ? (
  <Suspense fallback={<div className="graph-loading">Loading Knowledge Graph...</div>}>
    <KnowledgeGraph
      documents={documents}
      accountId={id}
      viewMode="account"
      height={600}
      onFileDrop={handleFileDrop}
      onNodeClick={(node) => {
        // Open document in editor
        navigate(`/document/${node.id}`);
      }}
    />
  </Suspense>
) : (
  // Existing list view
  <div className="file-list">
    {/* ... existing code ... */}
  </div>
)}
```

### Task 7: Integrate into AccountDashboard

Update `src/pages/AccountDashboard.jsx`:

```javascript
// Add imports
import React, { lazy, Suspense } from 'react';
import { knowledgeStorage } from '../utils/knowledgeStorage';
const KnowledgeGraph = lazy(() => import('../components/KnowledgeGraph/KnowledgeGraph'));

// Add state for global documents
const [globalDocuments, setGlobalDocuments] = useState([]);
const [showGlobalKnowledge, setShowGlobalKnowledge] = useState(true);

// Fetch documents marked as global
const fetchGlobalDocuments = async () => {
  const globalIds = knowledgeStorage.getGlobalDocuments();
  
  if (globalIds.length > 0) {
    const { data, error } = await supabase
      .from('account_data_sources')
      .select('*')
      .in('id', globalIds)
      .order('created_at', { ascending: false });
      
    if (data) {
      setGlobalDocuments(data);
    }
  }
};

// Load on mount
useEffect(() => {
  fetchGlobalDocuments();
  
  // Subscribe to storage changes
  const handleStorageChange = (e) => {
    if (e.key === 'se_auto_global_knowledge') {
      fetchGlobalDocuments();
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);

// Add below accounts grid
{showGlobalKnowledge && globalDocuments.length > 0 && (
  <div className="mt-12 glass-panel p-8">
    <div className="flex justify-between items-center mb-6">
      <h2 className="text-3xl font-light text-white">
        🌐 Company Knowledge Base
      </h2>
      <button
        onClick={() => setShowGlobalKnowledge(!showGlobalKnowledge)}
        className="text-gray-400 hover:text-white"
      >
        {showGlobalKnowledge ? 'Hide' : 'Show'}
      </button>
    </div>
    
    <p className="text-gray-400 mb-6">
      Shared templates, playbooks, and resources available across all accounts
    </p>
    
    <Suspense fallback={<div className="graph-loading">Loading Global Knowledge...</div>}>
      <KnowledgeGraph
        documents={globalDocuments}
        accountId="global"
        viewMode="global"
        height={500}
        showUpload={false}
        onNodeClick={(node) => {
          // Navigate to document
          navigate(`/document/${node.id}`);
        }}
      />
    </Suspense>
  </div>
)}
```

## PHASE 2: PERFORMANCE OPTIMIZATIONS

### Task 8: Add Performance Monitoring

Create `src/components/KnowledgeGraph/hooks/useGraphPerformance.js`:

```javascript
import { useState, useEffect, useRef } from 'react';

export const useGraphPerformance = (graphData) => {
  const [fps, setFps] = useState(60);
  const [nodeCount, setNodeCount] = useState(0);
  const [renderTime, setRenderTime] = useState(0);
  
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  
  useEffect(() => {
    setNodeCount(graphData.nodes.length);
  }, [graphData]);
  
  useEffect(() => {
    let animationId;
    
    const measureFPS = () => {
      frameCount.current++;
      const currentTime = performance.now();
      
      // Update FPS every second
      if (currentTime >= lastTime.current + 1000) {
        setFps(Math.round(frameCount.current * 1000 / (currentTime - lastTime.current)));
        frameCount.current = 0;
        lastTime.current = currentTime;
      }
      
      animationId = requestAnimationFrame(measureFPS);
    };
    
    measureFPS();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, []);
  
  return {
    fps,
    nodeCount,
    renderTime,
    isPerformant: fps > 30 && renderTime < 100
  };
};
```

### Task 9: Add Graph Controls

Create `src/components/KnowledgeGraph/components/GraphControls.jsx`:

```javascript
import React from 'react';

export const GraphControls = ({ graphRef, onSearch, onReset, onScreenshot }) => {
  const handleZoomIn = () => {
    if (graphRef.current) {
      graphRef.current.zoom(1.2);
    }
  };
  
  const handleZoomOut = () => {
    if (graphRef.current) {
      graphRef.current.zoom(0.8);
    }
  };
  
  const handleCenter = () => {
    if (graphRef.current) {
      graphRef.current.centerAt(0, 0, 1000);
    }
  };
  
  return (
    <div className="graph-controls">
      <button className="graph-control-btn" onClick={handleZoomIn} title="Zoom In">
        +
      </button>
      <button className="graph-control-btn" onClick={handleZoomOut} title="Zoom Out">
        −
      </button>
      <button className="graph-control-btn" onClick={handleCenter} title="Center">
        ⊙
      </button>
      <button className="graph-control-btn" onClick={onReset} title="Reset">
        ↻
      </button>
      <button className="graph-control-btn" onClick={onScreenshot} title="Screenshot">
        📷
      </button>
    </div>
  );
};
```

## TESTING CHECKLIST

### Before Starting Development
- [ ] All dependencies installed (`npm install` successful)
- [ ] Dev server runs without errors
- [ ] No TypeScript files in project
- [ ] Existing features still work

### After Phase 1
- [ ] 2D graph renders without errors
- [ ] No freezing on node hover
- [ ] Nodes highlight on hover using React state
- [ ] Click opens details panel
- [ ] File drop preview works
- [ ] View toggle persists in localStorage

### After Phase 2
- [ ] FPS counter shows 60fps with 100 nodes
- [ ] Zoom/pan controls work smoothly
- [ ] Global knowledge markers persist
- [ ] Graph appears in both locations
- [ ] No console errors

## SUCCESS CRITERIA

1. **Zero Backend Changes**: Works with existing Supabase schema
2. **Smooth Performance**: 60fps with 1000 nodes
3. **No Build Errors**: JavaScript-only implementation
4. **No Freezing**: React state manages all interactions
5. **Professional Polish**: Glassmorphic design that impresses
6. **Immediate Deploy**: Can push to production today

## COMMON PITFALLS TO AVOID

1. **DO NOT** create any `.ts` or `.tsx` files
2. **DO NOT** use `react-force-graph-3d` or `three.js`
3. **DO NOT** modify node properties directly in callbacks
4. **DO NOT** create new database tables or columns
5. **DO NOT** forget to install dependencies first
6. **DO NOT** use `process.env` - use `import.meta.env` for Vite

This implementation will create a stunning, performant knowledge graph that works immediately without any backend changes or build issues.