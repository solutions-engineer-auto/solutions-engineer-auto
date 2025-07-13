# Knowledge Graph Mock Development Guide

## Overview

This guide details how to build a fully functional knowledge graph visualization using mock data, allowing development to proceed before RAG/embedding infrastructure is ready.

## Why Mock First?

1. **Parallel Development**: Frontend can progress while backend sets up RAG
2. **UX Validation**: Test interactions and visual design early
3. **Stakeholder Buy-in**: Show working prototype quickly
4. **Risk Reduction**: Identify issues before complex integration

## Mock Data Architecture

### Data Structures

```typescript
// Mock node structure matching future real data
interface MockNode {
  id: string;
  name: string;
  type: 'document' | 'cluster' | 'concept' | 'global';
  position: { x: number; y: number; z: number };
  metadata: {
    fileType: string;
    uploadDate: string;
    size: number;
    lastAccessed?: string;
    usageCount: number;
    isGlobal: boolean;
    accountId?: string;
  };
  visual: {
    color: string;
    size: number;
    icon: string;
    glow: boolean;
  };
}

// Mock relationship structure
interface MockRelationship {
  source: string;
  target: string;
  strength: number; // 0-1, will be real similarity score
  type: 'semantic' | 'reference' | 'temporal';
  metadata: {
    sharedConcepts: string[];
    confidence: number;
  };
}
```

### Mock Data Generator

```typescript
// src/utils/mockKnowledgeGraph.js
export class MockKnowledgeGraphGenerator {
  constructor(existingDocuments) {
    this.documents = existingDocuments;
    this.conceptBank = [
      'pricing', 'security', 'integration', 'performance',
      'scalability', 'compliance', 'architecture', 'migration'
    ];
  }

  generateMockGraph() {
    const nodes = this.createNodes();
    const links = this.createRelationships(nodes);
    const clusters = this.identifyClusters(nodes, links);
    
    return { nodes, links, clusters };
  }

  createNodes() {
    const nodes = [];
    
    // Convert existing documents to nodes
    this.documents.forEach(doc => {
      nodes.push({
        id: doc.id,
        name: doc.file_name,
        type: 'document',
        position: this.calculatePosition(doc),
        metadata: {
          fileType: doc.file_type,
          uploadDate: doc.created_at,
          size: doc.metadata?.word_count || 1000,
          usageCount: Math.floor(Math.random() * 20),
          isGlobal: false,
          accountId: doc.account_id
        },
        visual: this.getVisualStyle(doc)
      });
    });
    
    // Add some concept nodes
    this.conceptBank.forEach((concept, i) => {
      nodes.push({
        id: `concept-${i}`,
        name: concept,
        type: 'concept',
        position: this.calculateConceptPosition(i),
        metadata: {
          relatedDocs: Math.floor(Math.random() * 5) + 1
        },
        visual: {
          color: '#00CED1',
          size: 8,
          icon: '💡',
          glow: false
        }
      });
    });
    
    // Add a few global knowledge nodes
    ['Company Playbook', 'Brand Guidelines', 'Security Standards'].forEach((name, i) => {
      nodes.push({
        id: `global-${i}`,
        name,
        type: 'global',
        position: { x: 0, y: i * 50 - 50, z: 0 },
        metadata: {
          isGlobal: true,
          usageCount: 50 + Math.floor(Math.random() * 50)
        },
        visual: {
          color: '#FFD700',
          size: 20,
          icon: '🌐',
          glow: true
        }
      });
    });
    
    return nodes;
  }

  createRelationships(nodes) {
    const relationships = [];
    
    // Create realistic-looking relationships
    nodes.forEach((node, i) => {
      if (node.type === 'document') {
        // Connect to 2-4 other documents
        const connectionCount = Math.floor(Math.random() * 3) + 2;
        const candidates = nodes.filter(n => 
          n.id !== node.id && n.type === 'document'
        );
        
        for (let j = 0; j < connectionCount && j < candidates.length; j++) {
          const target = candidates[Math.floor(Math.random() * candidates.length)];
          const strength = 0.6 + Math.random() * 0.4; // 0.6-1.0 range
          
          relationships.push({
            source: node.id,
            target: target.id,
            strength,
            type: 'semantic',
            metadata: {
              sharedConcepts: this.getSharedConcepts(),
              confidence: strength
            }
          });
        }
        
        // Connect to concepts
        const conceptCount = Math.floor(Math.random() * 3) + 1;
        const concepts = nodes.filter(n => n.type === 'concept');
        
        for (let j = 0; j < conceptCount && j < concepts.length; j++) {
          const concept = concepts[Math.floor(Math.random() * concepts.length)];
          relationships.push({
            source: node.id,
            target: concept.id,
            strength: 0.5 + Math.random() * 0.3,
            type: 'reference',
            metadata: {
              sharedConcepts: [concept.name],
              confidence: 0.8
            }
          });
        }
        
        // Some documents connect to global knowledge
        if (Math.random() > 0.7) {
          const globalNodes = nodes.filter(n => n.type === 'global');
          const globalNode = globalNodes[Math.floor(Math.random() * globalNodes.length)];
          
          relationships.push({
            source: node.id,
            target: globalNode.id,
            strength: 0.8,
            type: 'reference',
            metadata: {
              sharedConcepts: ['standards', 'guidelines'],
              confidence: 0.9
            }
          });
        }
      }
    });
    
    return relationships;
  }

  calculatePosition(doc) {
    // Group by file type with some randomness
    const typePositions = {
      'application/pdf': { x: -100, y: 0 },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { x: 100, y: 0 },
      'text/plain': { x: 0, y: -100 },
      'default': { x: 0, y: 100 }
    };
    
    const base = typePositions[doc.file_type] || typePositions.default;
    
    return {
      x: base.x + (Math.random() - 0.5) * 100,
      y: base.y + (Math.random() - 0.5) * 100,
      z: (Math.random() - 0.5) * 50
    };
  }

  getVisualStyle(doc) {
    const typeStyles = {
      'application/pdf': { color: '#FF6B6B', icon: '📑' },
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { color: '#4ECDC4', icon: '📄' },
      'text/plain': { color: '#45B7D1', icon: '📝' },
      'default': { color: '#96CEB4', icon: '📋' }
    };
    
    const style = typeStyles[doc.file_type] || typeStyles.default;
    
    return {
      ...style,
      size: 10 + Math.log(doc.metadata?.word_count || 1000) * 2,
      glow: false
    };
  }

  getSharedConcepts() {
    const count = Math.floor(Math.random() * 3) + 1;
    const concepts = [];
    
    for (let i = 0; i < count; i++) {
      concepts.push(
        this.conceptBank[Math.floor(Math.random() * this.conceptBank.length)]
      );
    }
    
    return [...new Set(concepts)];
  }
}
```

## Interactive Features with Mock Data

### 1. Drag & Drop Upload Preview

```typescript
// src/components/KnowledgeGraph/MockDragPreview.jsx
const MockDragPreview = ({ draggedFile, graphNodes }) => {
  const [previewConnections, setPreviewConnections] = useState([]);
  
  useEffect(() => {
    if (draggedFile) {
      // Simulate finding similar documents
      const similar = findMockSimilarDocuments(draggedFile, graphNodes);
      setPreviewConnections(similar);
    }
  }, [draggedFile, graphNodes]);
  
  const findMockSimilarDocuments = (file, nodes) => {
    // Mock logic: find documents with similar type or name patterns
    return nodes
      .filter(n => n.type === 'document')
      .map(node => ({
        nodeId: node.id,
        similarity: calculateMockSimilarity(file, node),
        reason: getMockReason(file, node)
      }))
      .filter(conn => conn.similarity > 0.6)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  };
  
  return (
    <div className="preview-connections">
      {previewConnections.map(conn => (
        <div key={conn.nodeId} className="connection-preview">
          <span className="similarity-score">
            {Math.round(conn.similarity * 100)}% match
          </span>
          <span className="reason">{conn.reason}</span>
        </div>
      ))}
    </div>
  );
};
```

### 2. Simulated AI Access

```typescript
// src/hooks/useMockAIAccess.js
export const useMockAIAccess = (graphData) => {
  const [accessedNodes, setAccessedNodes] = useState(new Set());
  const [accessPath, setAccessPath] = useState([]);
  
  const simulateAIAccess = useCallback((query) => {
    // Reset previous access
    setAccessedNodes(new Set());
    setAccessPath([]);
    
    // Simulate AI searching through documents
    const searchSequence = [];
    
    // Start with most relevant documents (mock scoring)
    const scoredNodes = graphData.nodes
      .filter(n => n.type === 'document')
      .map(node => ({
        node,
        score: calculateMockRelevance(query, node)
      }))
      .sort((a, b) => b.score - a.score);
    
    // Simulate progressive access
    scoredNodes.slice(0, 5).forEach((item, index) => {
      setTimeout(() => {
        setAccessedNodes(prev => new Set([...prev, item.node.id]));
        setAccessPath(prev => [...prev, {
          nodeId: item.node.id,
          timestamp: Date.now(),
          relevance: item.score
        }]);
        
        // Pulse effect
        setTimeout(() => {
          setAccessedNodes(prev => {
            const next = new Set(prev);
            next.delete(item.node.id);
            return next;
          });
        }, 2000);
      }, index * 500); // Stagger access
    });
  }, [graphData]);
  
  return { accessedNodes, accessPath, simulateAIAccess };
};
```

### 3. Mock Clustering

```typescript
// src/utils/mockClustering.js
export const performMockClustering = (nodes, links) => {
  const clusters = {
    technical: {
      id: 'cluster-tech',
      name: 'Technical Documentation',
      color: '#4ECDC4',
      nodes: []
    },
    business: {
      id: 'cluster-biz',
      name: 'Business Documents',
      color: '#FF6B6B',
      nodes: []
    },
    legal: {
      id: 'cluster-legal',
      name: 'Legal & Compliance',
      color: '#96CEB4',
      nodes: []
    }
  };
  
  // Assign nodes to clusters based on mock criteria
  nodes.forEach(node => {
    if (node.type === 'document') {
      const cluster = determineCluster(node);
      if (clusters[cluster]) {
        clusters[cluster].nodes.push(node.id);
      }
    }
  });
  
  return Object.values(clusters);
};

const determineCluster = (node) => {
  const name = node.name.toLowerCase();
  
  if (name.includes('api') || name.includes('tech') || name.includes('spec')) {
    return 'technical';
  } else if (name.includes('proposal') || name.includes('pricing')) {
    return 'business';
  } else if (name.includes('contract') || name.includes('terms')) {
    return 'legal';
  }
  
  // Random assignment for others
  const clusters = ['technical', 'business', 'legal'];
  return clusters[Math.floor(Math.random() * clusters.length)];
};
```

## Testing Mock Interactions

### 1. User Interaction Tests

```typescript
// src/components/KnowledgeGraph/__tests__/MockInteractions.test.js
describe('Mock Knowledge Graph Interactions', () => {
  it('should highlight similar documents on file hover', async () => {
    const { getByTestId } = render(<KnowledgeGraph useMockData />);
    
    const dropZone = getByTestId('graph-drop-zone');
    const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
    
    fireEvent.dragEnter(dropZone, { dataTransfer: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByText(/similar documents found/i)).toBeInTheDocument();
    });
  });
  
  it('should show AI access path when query submitted', async () => {
    const { getByTestId } = render(<KnowledgeGraph useMockData />);
    
    const searchInput = getByTestId('ai-query-input');
    fireEvent.change(searchInput, { target: { value: 'pricing information' } });
    fireEvent.submit(searchInput);
    
    await waitFor(() => {
      const accessedNodes = screen.getAllByTestId('accessed-node');
      expect(accessedNodes.length).toBeGreaterThan(0);
    });
  });
});
```

### 2. Performance with Mock Data

```typescript
// src/utils/mockDataScaling.js
export const generateScalableMockData = (nodeCount = 100) => {
  const nodes = [];
  const links = [];
  
  // Generate nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `node-${i}`,
      name: `Document ${i}`,
      type: i % 10 === 0 ? 'global' : 'document',
      position: {
        x: (Math.random() - 0.5) * 1000,
        y: (Math.random() - 0.5) * 1000,
        z: (Math.random() - 0.5) * 500
      },
      // ... other properties
    });
  }
  
  // Generate relationships (sparse for performance)
  const avgConnections = 3;
  nodes.forEach((node, i) => {
    const connectionCount = Math.floor(Math.random() * avgConnections * 2);
    
    for (let j = 0; j < connectionCount; j++) {
      const targetIndex = Math.floor(Math.random() * nodeCount);
      if (targetIndex !== i) {
        links.push({
          source: node.id,
          target: nodes[targetIndex].id,
          strength: Math.random()
        });
      }
    }
  });
  
  return { nodes, links };
};
```

## Mock to Real Data Migration

### Transition Strategy

```typescript
// src/services/graphDataService.js
export class GraphDataService {
  constructor(useMockData = true) {
    this.useMockData = useMockData;
    this.mockGenerator = new MockKnowledgeGraphGenerator();
  }
  
  async getGraphData(accountId) {
    if (this.useMockData) {
      return this.mockGenerator.generateMockGraph();
    }
    
    // Real implementation
    return this.fetchRealGraphData(accountId);
  }
  
  async processDocument(file) {
    if (this.useMockData) {
      // Return mock embeddings and relationships
      return {
        embedding: new Array(1536).fill(0).map(() => Math.random()),
        relationships: this.mockGenerator.createRelationships([]),
        position: this.mockGenerator.calculatePosition({ file_type: file.type })
      };
    }
    
    // Real processing
    return this.processWithRAG(file);
  }
}
```

## Demo Script with Mock Data

### 1. Initial Load
"Here's our knowledge base visualized as an interactive graph. Each node represents a document, and the connections show how they relate to each other."

### 2. Drag & Drop Demo
"When I drag this new RFP over the graph, watch how it previews where it will connect based on similar content..."

### 3. AI Access Visualization
"When the AI generates a response, you can see exactly which documents it's accessing in real-time..."

### 4. Global vs Account Knowledge
"Notice how company-wide documents appear as golden diamonds in the center, while account-specific documents cluster around them..."

## Benefits of Mock-First Development

1. **Immediate Progress**: No waiting for backend infrastructure
2. **UX Validation**: Test all interactions with realistic data
3. **Performance Testing**: Identify bottlenecks early
4. **Stakeholder Demos**: Show working features quickly
5. **Parallel Development**: Frontend and backend can work independently
6. **Risk Reduction**: Discover issues before complex integration

## Conclusion

By building with comprehensive mock data first, we can:
- Deliver a working prototype in Week 1
- Validate all UX decisions early
- Build excitement with stakeholders
- Ensure smooth transition to real data
- Maintain development momentum

The mock system is designed to mirror the real data structure exactly, making the transition seamless when RAG is ready. 