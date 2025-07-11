# 🧠 KNOWLEDGE GRAPH ULTIMATE IMPLEMENTATION PROMPT

You are about to implement an interactive 3D knowledge graph visualization that transforms how users perceive AI intelligence. This feature makes the abstract concept of "context files" into a living, breathing visual representation of the AI's knowledge base.

## 🎯 CORE VISION
Create an Obsidian-style knowledge graph where:
- Documents are nodes floating in 3D space
- Semantic relationships are visible connections
- AI document access creates real-time pulses
- Drag-and-drop uploads show instant integration
- Global vs account knowledge is visually distinct

## 🏗️ CURRENT SYSTEM CONTEXT
```
- Frontend: React + Vite + TailwindCSS + TipTap
- Backend: Supabase (PostgreSQL + Realtime)
- Document Storage: account_data_sources table
- AI Agent: LangGraph with document retrieval
- File Processing: documentProcessor.js extracts HTML
- Real-time: Supabase subscriptions already working
```

## 📋 PHASE 1: MOCK VISUALIZATION (BUILD THIS FIRST!)

### Step 1: Install Dependencies
```bash
npm install react-force-graph-3d three d3-force-3d localforage
```

### Step 2: Create Mock Data Generator
Create `src/utils/mockKnowledgeGraph.js`:
```javascript
export class MockKnowledgeGraphGenerator {
  constructor(existingDocuments) {
    this.documents = existingDocuments;
    this.conceptBank = ['pricing', 'security', 'integration', 'performance', 'scalability', 'compliance', 'architecture', 'migration'];
  }

  generateMockGraph() {
    const nodes = this.createNodes();
    const links = this.createRelationships(nodes);
    return { nodes, links };
  }

  createNodes() {
    const nodes = [];
    
    // Convert real documents to nodes
    this.documents.forEach(doc => {
      nodes.push({
        id: doc.id,
        name: doc.file_name,
        type: 'document',
        position: this.calculateMockPosition(doc),
        metadata: {
          fileType: doc.file_type,
          uploadDate: doc.created_at,
          wordCount: doc.metadata?.word_count || 1000,
          usageCount: Math.floor(Math.random() * 20),
          isGlobal: false,
          accountId: doc.account_id
        },
        visual: {
          color: this.getColorByType(doc.file_type),
          size: 10 + Math.log(doc.metadata?.word_count || 1000) * 2,
          icon: this.getIconByType(doc.file_type),
          glow: false
        }
      });
    });
    
    // Add mock global knowledge nodes
    ['Company Playbook', 'Brand Guidelines', 'Security Standards'].forEach((name, i) => {
      nodes.push({
        id: `global-${i}`,
        name,
        type: 'global',
        position: { x: 0, y: i * 50 - 50, z: 0 },
        metadata: { isGlobal: true, usageCount: 50 + Math.floor(Math.random() * 50) },
        visual: { color: '#FFD700', size: 20, icon: '🌐', glow: true }
      });
    });
    
    return nodes;
  }

  createRelationships(nodes) {
    const relationships = [];
    nodes.forEach(node => {
      if (node.type === 'document') {
        // Create 2-4 connections per document
        const connectionCount = Math.floor(Math.random() * 3) + 2;
        const candidates = nodes.filter(n => n.id !== node.id && n.type === 'document');
        
        for (let i = 0; i < connectionCount && i < candidates.length; i++) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          relationships.push({
            source: node.id,
            target: target.id,
            value: 0.6 + Math.random() * 0.4 // Mock similarity 0.6-1.0
          });
        }
        
        // Some connect to global knowledge
        if (Math.random() > 0.7) {
          const globalNode = nodes.find(n => n.type === 'global');
          if (globalNode) {
            relationships.push({
              source: node.id,
              target: globalNode.id,
              value: 0.8
            });
          }
        }
      }
    });
    return relationships;
  }

  calculateMockPosition(doc) {
    const typePositions = {
      'application/pdf': { x: -100, y: 0 },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { x: 100, y: 0 },
      'text/plain': { x: 0, y: -100 }
    };
    const base = typePositions[doc.file_type] || { x: 0, y: 100 };
    return {
      x: base.x + (Math.random() - 0.5) * 100,
      y: base.y + (Math.random() - 0.5) * 100,
      z: (Math.random() - 0.5) * 50
    };
  }

  getColorByType(fileType) {
    const colors = {
      'application/pdf': '#FF6B6B',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '#4ECDC4',
      'text/plain': '#45B7D1'
    };
    return colors[fileType] || '#96CEB4';
  }

  getIconByType(fileType) {
    const icons = {
      'application/pdf': '📑',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📄',
      'text/plain': '📝'
    };
    return icons[fileType] || '📋';
  }
}
```

### Step 3: Create Knowledge Graph Component
Create `src/components/KnowledgeGraph/KnowledgeGraph.jsx`:
```javascript
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { MockKnowledgeGraphGenerator } from '../../utils/mockKnowledgeGraph';
import { supabase } from '../../supabaseClient';
import './KnowledgeGraph.css';

const KnowledgeGraph = ({ 
  accountId, 
  documents = [], 
  viewMode = 'account', // 'account', 'global', or 'both'
  height = 600,
  showControls = true,
  showUpload = true,
  onNodeClick,
  onFileDrop
}) => {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [accessedNodes, setAccessedNodes] = useState(new Set());
  const [draggedFile, setDraggedFile] = useState(null);
  const [previewConnections, setPreviewConnections] = useState([]);
  const graphRef = useRef();

  // Initialize with mock data
  useEffect(() => {
    const generator = new MockKnowledgeGraphGenerator(documents);
    const mockData = generator.generateMockGraph();
    setGraphData(mockData);
  }, [documents]);

  // Add real-time subscription
  useEffect(() => {
    if (!accountId) return;
    
    const channel = supabase
      .channel(`graph-${accountId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `account_id=eq.${accountId}`
      }, (payload) => {
        if (payload.new.message_type === 'event' && 
            payload.new.event_data?.type === 'retrieval_complete') {
          
          // Extract accessed documents
          const accessedDocs = payload.new.event_data.accessed_documents || [];
          
          // Trigger visual pulses
          accessedDocs.forEach((doc, index) => {
            setTimeout(() => {
              setAccessedNodes(prev => new Set([...prev, doc.id]));
              
              // Auto-remove after animation
              setTimeout(() => {
                setAccessedNodes(prev => {
                  const next = new Set(prev);
                  next.delete(doc.id);
                  return next;
                });
              }, 3000);
            }, index * 200);
          });
        }
      })
      .subscribe();
      
    return () => channel.unsubscribe();
  }, [accountId]);

  // Handle node interactions
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    // Implement focus mode - show only connected nodes
    if (graphRef.current) {
      const { x, y, z } = node;
      graphRef.current.cameraPosition({ x, y, z: z + 100 }, node, 1000);
    }
  }, []);

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node);
    document.body.style.cursor = node ? 'pointer' : 'default';
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.items && e.dataTransfer.items[0]) {
      const file = e.dataTransfer.items[0];
      setDraggedFile({ name: file.name, type: file.type });
      
      // Calculate preview connections
      const mockConnections = graphData.nodes
        .filter(n => n.type === 'document')
        .map(node => ({
          nodeId: node.id,
          similarity: 0.5 + Math.random() * 0.5,
          node
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      
      setPreviewConnections(mockConnections);
    }
  }, [graphData]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    
    if (files[0]) {
      const file = files[0];
      
      // Show processing state
      const tempNode = {
        id: `temp-${Date.now()}`,
        name: file.name,
        type: 'document',
        position: { x: 0, y: 0, z: 0 },
        metadata: { isProcessing: true },
        visual: { 
          color: '#00FF00', 
          size: 20, 
          glow: true,
          icon: '⏳'
        }
      };
      
      // Add temporary node
      setGraphData(prev => ({
        nodes: [...prev.nodes, tempNode],
        links: prev.links
      }));
      
      try {
        // Process file (reuse existing documentProcessor)
        // Assuming documentProcessor is imported or available globally
        const result = await documentProcessor.processFile(file);
        
        // Save to database
        const { data, error } = await supabase
          .from('account_data_sources')
          .insert({
            account_id: accountId,
            file_name: file.name,
            file_type: file.type,
            content: result.html,
            metadata: result.metadata,
            // Mock embedding for now
            graph_position: { x: 0, y: 0, z: 0 }
          })
          .select()
          .single();
          
        if (!error && data) {
          // Replace temp node with real node
          setGraphData(prev => ({
            nodes: prev.nodes.map(n => 
              n.id === tempNode.id ? {
                ...n,
                id: data.id,
                metadata: { ...n.metadata, isProcessing: false },
                visual: { ...n.visual, icon: '✅' }
              } : n
            ),
            links: [
              ...prev.links,
              // Add mock connections
              ...previewConnections.map(conn => ({
                source: data.id,
                target: conn.nodeId,
                value: conn.similarity
              }))
            ]
          }));
          
          // Animate integration
          setTimeout(() => {
            if (graphRef.current) {
              graphRef.current.zoomToFit(400);
            }
          }, 500);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        // Remove temp node on error
        setGraphData(prev => ({
          nodes: prev.nodes.filter(n => n.id !== tempNode.id),
          links: prev.links
        }));
      }
    }
    
    setDraggedFile(null);
    setPreviewConnections([]);
  }, [accountId, previewConnections]);

  const handleDragLeave = useCallback(() => {
    setDraggedFile(null);
    setPreviewConnections([]);
  }, []);

  // Simulate AI access
  const simulateAIAccess = useCallback((query) => {
    // Mock: Pulse random nodes as if AI is accessing them
    const nodesToAccess = graphData.nodes
      .filter(n => n.type === 'document')
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);
    
    nodesToAccess.forEach((node, index) => {
      setTimeout(() => {
        setAccessedNodes(prev => new Set([...prev, node.id]));
        
        // Remove pulse after 2 seconds
        setTimeout(() => {
          setAccessedNodes(prev => {
            const next = new Set(prev);
            next.delete(node.id);
            return next;
          });
        }, 2000);
      }, index * 500);
    });
  }, [graphData]);

  // Custom node rendering
  const nodeThreeObject = useCallback((node) => {
    if (accessedNodes.has(node.id)) {
      // Create pulsing effect for accessed nodes
      const geometry = new THREE.SphereGeometry(node.visual.size * 1.5);
      const material = new THREE.MeshBasicMaterial({
        color: node.visual.color,
        transparent: true,
        opacity: 0.6
      });
      const mesh = new THREE.Mesh(geometry, material);
      
      // Add pulse animation
      mesh.scale.set(1, 1, 1);
      const animate = () => {
        mesh.scale.x = mesh.scale.y = mesh.scale.z = 1 + Math.sin(Date.now() * 0.003) * 0.3;
        requestAnimationFrame(animate);
      };
      animate();
      
      return mesh;
    }
    return false; // Use default rendering
  }, [accessedNodes]);

  // Adjust container height
  const containerBaseStyles = {
    position: 'relative',
    width: '100%',
    background: 'linear-gradient(135deg, #0a0f1e 0%, #1a0f2e 100%)',
    borderRadius: '12px',
    overflow: 'hidden',
  };

  const containerStyle = {
    height: `${height}px`,
    ...containerBaseStyles
  };

  // Filter documents based on viewMode
  const filteredDocuments = useMemo(() => {
    if (viewMode === 'global') {
      return documents.filter(doc => doc.is_global === true);
    } else if (viewMode === 'account') {
      return documents.filter(doc => !doc.is_global);
    }
    return documents; // 'both'
  }, [documents, viewMode]);

  return (
    <div 
      className="knowledge-graph-container"
      style={containerStyle}
      onDragOver={showUpload ? handleDragOver : undefined}
      onDrop={showUpload ? handleDrop : undefined}
      onDragLeave={showUpload ? handleDragLeave : undefined}
    >
      {/* Conditionally render controls */}
      {showControls && (
        <div className="graph-controls glass-panel">
          <button onClick={() => simulateAIAccess('test query')} className="btn-volcanic">
            Simulate AI Access
          </button>
          <button onClick={() => graphRef.current?.zoomToFit(400)} className="btn-volcanic">
            Reset View
          </button>
        </div>
      )}

      {/* Node Details Panel */}
      {selectedNode && (
        <div className="node-details glass-panel">
          <h3>{selectedNode.name}</h3>
          <p>Type: {selectedNode.type}</p>
          <p>Usage: {selectedNode.metadata?.usageCount || 0} times</p>
          <button onClick={() => setSelectedNode(null)} className="btn-volcanic">
            Close
          </button>
        </div>
      )}

      {/* Drag Preview */}
      {draggedFile && (
        <div className="drag-preview glass-panel">
          <h4>Drop to add: {draggedFile.name}</h4>
          <div className="preview-connections">
            {previewConnections.map(conn => (
              <div key={conn.nodeId} className="connection-preview">
                <span>{Math.round(conn.similarity * 100)}% match with {conn.node.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3D Graph */}
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        nodeLabel="name"
        nodeAutoColorBy="type"
        nodeVal={node => node.visual.size}
        nodeOpacity={0.9}
        nodeThreeObject={nodeThreeObject}
        nodeThreeObjectExtend={true}
        linkOpacity={0.4}
        linkWidth={link => link.value * 2}
        linkDirectionalParticles={link => link.value > 0.8 ? 2 : 0}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={handleNodeClick}
        onNodeHover={handleNodeHover}
        backgroundColor="rgba(0, 0, 0, 0)"
        showNavInfo={false}
      />
    </div>
  );
};

export default KnowledgeGraph;
```

### Step 4: Add Styles
Create `src/components/KnowledgeGraph/KnowledgeGraph.css`:
```css
.knowledge-graph-container {
  position: relative;
  width: 100%;
  height: 600px;
  background: linear-gradient(135deg, #0a0f1e 0%, #1a0f2e 100%);
  border-radius: 12px;
  overflow: hidden;
}

.graph-controls {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 10;
  display: flex;
  gap: 10px;
}

.node-details {
  position: absolute;
  top: 20px;
  right: 20px;
  width: 300px;
  z-index: 10;
  padding: 20px;
}

.drag-preview {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  padding: 20px;
  max-width: 400px;
}

.connection-preview {
  padding: 8px;
  margin: 4px 0;
  background: rgba(0, 255, 255, 0.1);
  border-radius: 4px;
  font-size: 14px;
}

/* Pulse animation for AI access */
@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
}

.accessing {
  animation: pulse 2s infinite;
}
```

### Step 5: Integrate into ProspectDetailPage
Update `src/pages/ProspectDetailPage.jsx`:
```javascript
// Add imports
import KnowledgeGraph from '../components/KnowledgeGraph/KnowledgeGraph';

// Add state for view mode
const [viewMode, setViewMode] = useState('list'); // 'list' or 'graph'

// In the render, replace or add toggle for Context Files section:
<div className="glass-panel">
  <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
    <div>
      <h2 className="text-2xl font-light text-white">🧠 AI Knowledge Base</h2>
      <p className="text-sm text-white/50 mt-2">
        Your AI's second brain - Documents here actively inform every response
      </p>
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => setViewMode('list')}
        className={`px-4 py-2 rounded-lg transition-all ${
          viewMode === 'list' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/60 hover:text-white'
        }`}
      >
        List View
      </button>
      <button
        onClick={() => setViewMode('graph')}
        className={`px-4 py-2 rounded-lg transition-all ${
          viewMode === 'graph' ? 'bg-cyan-500/20 text-cyan-400' : 'text-white/60 hover:text-white'
        }`}
      >
        Graph View
      </button>
    </div>
  </div>
  
  <div className="px-8 py-8">
    {viewMode === 'list' ? (
      // Existing list view code
      <>
        <FileUploadDropzone onFileSelect={handleFileSelect} maxFiles={1} />
        {/* ... existing list rendering ... */}
      </>
    ) : (
      // New graph view
      <KnowledgeGraph 
        accountId={id}
        documents={accountDataSources}
        viewMode="account"
        height={600}
        showControls={true}
        showUpload={true}
        onFileDrop={handleFileSelect}
      />
    )}
  </div>
</div>
```

### Step 6: Integrate into AccountDashboard
Update `src/pages/AccountDashboard.jsx` to show a company-wide knowledge graph below the accounts:
```javascript
// Add imports
import KnowledgeGraph from '../components/KnowledgeGraph/KnowledgeGraph';

// Add state for global documents
const [globalDocuments, setGlobalDocuments] = useState([]);

// Fetch global knowledge base documents
useEffect(() => {
  const fetchGlobalDocuments = async () => {
    try {
      // For MVP, fetch all documents marked as global
      const { data, error } = await supabase
        .from('account_data_sources')
        .select('*')
        .eq('is_global', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGlobalDocuments(data || []);
    } catch (error) {
      console.error('Failed to fetch global documents:', error);
    }
  };
  
  fetchGlobalDocuments();
}, []);

// Add after the accounts grid, before the closing container div:
{/* Company Knowledge Graph */}
<div className="mt-12 glass-panel p-8">
  <div className="mb-6">
    <h2 className="text-3xl font-light text-white tracking-wide mb-2">
      🌐 Company Knowledge Base
    </h2>
    <p className="text-sm text-white/60 font-light">
      Your organization's shared knowledge that powers every account
    </p>
  </div>
  
  <KnowledgeGraph 
    accountId="global" // Special ID for global view
    documents={globalDocuments}
    viewMode="global"
    height={500} // Slightly smaller for dashboard view
    showControls={true}
    showUpload={false} // No direct upload from dashboard
  />
</div>
```

### Step 7: Add Props Support to KnowledgeGraph
Update `src/components/KnowledgeGraph/KnowledgeGraph.jsx` to accept additional props:
```javascript
const KnowledgeGraph = ({ 
  accountId, 
  documents = [], 
  viewMode = 'account', // 'account', 'global', or 'both'
  height = 600,
  showControls = true,
  showUpload = true,
  onNodeClick,
  onFileDrop
}) => {
  // ... existing state ...

  // Adjust container height
  const containerStyle = {
    height: `${height}px`,
    ...containerBaseStyles
  };

  // Filter documents based on viewMode
  const filteredDocuments = useMemo(() => {
    if (viewMode === 'global') {
      return documents.filter(doc => doc.is_global === true);
    } else if (viewMode === 'account') {
      return documents.filter(doc => !doc.is_global);
    }
    return documents; // 'both'
  }, [documents, viewMode]);

  // ... rest of component logic ...

  return (
    <div 
      className="knowledge-graph-container"
      style={containerStyle}
      onDragOver={showUpload ? handleDragOver : undefined}
      onDrop={showUpload ? handleDrop : undefined}
      onDragLeave={showUpload ? handleDragLeave : undefined}
    >
      {/* Conditionally render controls */}
      {showControls && (
        <div className="graph-controls glass-panel">
          {/* ... existing controls ... */}
        </div>
      )}
      
      {/* ... rest of component ... */}
    </div>
  );
};
```

### Step 8: Update ProspectDetailPage for consistency
Update the ProspectDetailPage integration to pass the new props:
```javascript
<KnowledgeGraph 
  accountId={id}
  documents={accountDataSources}
  viewMode="account"
  height={600}
  showControls={true}
  showUpload={true}
  onFileDrop={handleFileSelect}
/>
```

## 🎯 DUAL PLACEMENT BENEFITS

### 1. AccountDashboard (Global View)
- Shows company-wide knowledge base
- Demonstrates organizational knowledge assets
- Helps users understand shared resources
- Encourages knowledge reuse across accounts

### 2. ProspectDetailPage (Account View)
- Shows account-specific documents
- Enables drag-drop upload
- Visualizes document relationships
- Shows real-time AI access

## 🚀 PHASE 2: ADD REAL-TIME AI ACCESS VISUALIZATION

### Step 1: Subscribe to AI Events
Update `KnowledgeGraph.jsx`:
```javascript
// Add real-time subscription
useEffect(() => {
  if (!accountId) return;
  
  const channel = supabase
    .channel(`graph-${accountId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'chat_messages',
      filter: `account_id=eq.${accountId}`
    }, (payload) => {
      if (payload.new.message_type === 'event' && 
          payload.new.event_data?.type === 'retrieval_complete') {
        
        // Extract accessed documents
        const accessedDocs = payload.new.event_data.accessed_documents || [];
        
        // Trigger visual pulses
        accessedDocs.forEach((doc, index) => {
          setTimeout(() => {
            setAccessedNodes(prev => new Set([...prev, doc.id]));
            
            // Auto-remove after animation
            setTimeout(() => {
              setAccessedNodes(prev => {
                const next = new Set(prev);
                next.delete(doc.id);
                return next;
              });
            }, 3000);
          }, index * 200);
        });
      }
    })
    .subscribe();
    
  return () => channel.unsubscribe();
}, [accountId]);
```

## 🎨 PHASE 3: ADD DRAG-DROP UPLOAD WITH PREVIEW

### Step 1: Enhance Drop Handler
```javascript
const handleDrop = async (e) => {
  e.preventDefault();
  const files = [...e.dataTransfer.files];
  
  if (files[0]) {
    const file = files[0];
    
    // Show processing state
    const tempNode = {
      id: `temp-${Date.now()}`,
      name: file.name,
      type: 'document',
      position: { x: 0, y: 0, z: 0 },
      metadata: { isProcessing: true },
      visual: { 
        color: '#00FF00', 
        size: 20, 
        glow: true,
        icon: '⏳'
      }
    };
    
    // Add temporary node
    setGraphData(prev => ({
      nodes: [...prev.nodes, tempNode],
      links: prev.links
    }));
    
    try {
      // Process file (reuse existing documentProcessor)
      const result = await documentProcessor.processFile(file);
      
      // Save to database
      const { data, error } = await supabase
        .from('account_data_sources')
        .insert({
          account_id: accountId,
          file_name: file.name,
          file_type: file.type,
          content: result.html,
          metadata: result.metadata,
          // Mock embedding for now
          graph_position: { x: 0, y: 0, z: 0 }
        })
        .select()
        .single();
        
      if (!error && data) {
        // Replace temp node with real node
        setGraphData(prev => ({
          nodes: prev.nodes.map(n => 
            n.id === tempNode.id ? {
              ...n,
              id: data.id,
              metadata: { ...n.metadata, isProcessing: false },
              visual: { ...n.visual, icon: '✅' }
            } : n
          ),
          links: [
            ...prev.links,
            // Add mock connections
            ...previewConnections.map(conn => ({
              source: data.id,
              target: conn.nodeId,
              value: conn.similarity
            }))
          ]
        }));
        
        // Animate integration
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(400);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      // Remove temp node on error
      setGraphData(prev => ({
        nodes: prev.nodes.filter(n => n.id !== tempNode.id),
        links: prev.links
      }));
    }
  }
};
```

## 🌐 PHASE 4: ADD GLOBAL KNOWLEDGE TOGGLE

### Step 1: Add View Mode Toggle
```javascript
// Add to KnowledgeGraph component
const [knowledgeMode, setKnowledgeMode] = useState('account'); // 'account', 'global', 'both'

// Add toggle UI
<div className="knowledge-mode-toggle glass-panel">
  <button 
    onClick={() => setKnowledgeMode('account')}
    className={knowledgeMode === 'account' ? 'active' : ''}
  >
    Account Only
  </button>
  <button 
    onClick={() => setKnowledgeMode('global')}
    className={knowledgeMode === 'global' ? 'active' : ''}
  >
    Global Only
  </button>
  <button 
    onClick={() => setKnowledgeMode('both')}
    className={knowledgeMode === 'both' ? 'active' : ''}
  >
    Both
  </button>
</div>

// Filter nodes based on mode
const visibleNodes = graphData.nodes.filter(node => {
  if (knowledgeMode === 'account') return !node.metadata.isGlobal;
  if (knowledgeMode === 'global') return node.metadata.isGlobal;
  return true; // 'both'
});
```

## 📊 PHASE 5: ADD PERFORMANCE OPTIMIZATIONS

### Step 1: Implement Level of Detail
```javascript
// Add to nodeThreeObject
const nodeThreeObject = useCallback((node) => {
  const camera = graphRef.current?.camera();
  if (!camera) return false;
  
  const distance = camera.position.distanceTo(node);
  
  // Skip rendering for distant nodes
  if (distance > 500) {
    const geometry = new THREE.BoxGeometry(5, 5, 5);
    const material = new THREE.MeshBasicMaterial({ color: node.visual.color });
    return new THREE.Mesh(geometry, material);
  }
  
  // Full detail for close nodes
  if (distance < 100) {
    // Add text label, icon, etc.
  }
  
  return false; // Default rendering
}, []);
```

## 🎯 SUCCESS CRITERIA

1. **Visual Impact**: Graph renders smoothly with 100+ nodes
2. **Intuitive Interaction**: Drag-drop feels magical
3. **Real-time Feedback**: AI access creates immediate pulses
4. **Clear Hierarchy**: Global vs account knowledge obvious
5. **Performance**: 60fps with typical document counts

## 💡 PRO TIPS

1. Start with mock data - don't wait for embeddings
2. Use feature flags to ship incrementally
3. Add tooltips explaining what connections mean
4. Include a "tutorial mode" for first-time users
5. Cache graph layouts in localStorage
6. Use Web Workers for physics calculations if needed
7. Add keyboard shortcuts (spacebar to reset view, etc.)

## 🚨 CRITICAL DETAILS

- Keep existing file upload working in parallel
- Don't break the current Context Files functionality
- Use the same glass-panel styling for consistency
- Ensure mobile responsiveness (fallback to list view)
- Add loading states for all async operations
- Handle errors gracefully with user-friendly messages

## 🎬 DEMO SCRIPT

1. "Here's your AI's knowledge base - every document you've uploaded"
2. *Drag file over graph* "Watch as we add new knowledge..."
3. *Drop file* "The AI instantly understands how this connects to everything else"
4. *Click AI generate* "Now watch which documents the AI accesses to answer your question"
5. *Nodes pulse* "You can see exactly what knowledge is being used"
6. *Toggle to global view* "And here's your company's shared knowledge that enhances every account"

BUILD THIS EXACTLY AS SPECIFIED. THE MOCK VERSION ALONE WILL BE INCREDIBLE. EMBEDDINGS CAN COME LATER. 