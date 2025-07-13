# Knowledge Graph RAG Migration Guide

This guide details the steps to migrate the Knowledge Graph from mock relationships to real semantic relationships using RAG (Retrieval-Augmented Generation) and embeddings.

## Overview

The current Knowledge Graph implementation uses mock relationships generated randomly. This migration will:
- Add real semantic embeddings to documents
- Create meaningful relationships based on content similarity
- Enable intelligent document clustering
- Support semantic search capabilities

## Prerequisites

- [ ] Supabase pgvector extension enabled
- [ ] OpenAI API key or alternative embedding service
- [ ] Completed the initial database migration (`20250111_add_is_global_to_data_sources.sql`)

## Phase 1: Database Migration

### 1.1 Apply the Existing Migration

If you haven't already, apply the migration that adds the necessary columns:

```bash
supabase db push
```

This adds:
- `is_global` column for global knowledge marking
- `graph_position` for saving node positions
- `embedding` vector(1536) column for storing embeddings

### 1.2 Enable pgvector Extension

```sql
-- Enable pgvector if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create index for similarity search
CREATE INDEX account_data_sources_embedding_idx 
ON account_data_sources 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## Phase 2: Backend Implementation

### 2.1 Create Embedding Service

Create `src/services/embeddingService.js`:

```javascript
// Embedding service for generating document embeddings
import { supabase } from '../supabaseClient';

export class EmbeddingService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.endpoint = 'https://api.openai.com/v1/embeddings';
  }

  async generateEmbedding(text) {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        input: text,
        model: 'text-embedding-ada-002'
      })
    });

    const data = await response.json();
    return data.data[0].embedding;
  }

  async updateDocumentEmbedding(documentId, content) {
    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(content);
      
      // Update in database
      const { error } = await supabase
        .from('account_data_sources')
        .update({ embedding })
        .eq('id', documentId);
        
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error updating embedding:', error);
      return { success: false, error };
    }
  }

  async findSimilarDocuments(documentId, threshold = 0.8) {
    // Use Supabase RPC function for similarity search
    const { data, error } = await supabase
      .rpc('find_similar_documents', {
        query_document_id: documentId,
        similarity_threshold: threshold,
        limit_count: 20
      });
      
    return data || [];
  }
}
```

### 2.2 Create Supabase Functions

Add these RPC functions to your Supabase SQL:

```sql
-- Function to find similar documents using cosine similarity
CREATE OR REPLACE FUNCTION find_similar_documents(
  query_document_id UUID,
  similarity_threshold FLOAT DEFAULT 0.8,
  limit_count INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  file_name TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
DECLARE
  query_embedding vector(1536);
BEGIN
  -- Get the embedding for the query document
  SELECT embedding INTO query_embedding
  FROM account_data_sources
  WHERE id = query_document_id;
  
  -- Return similar documents
  RETURN QUERY
  SELECT 
    ads.id,
    ads.file_name,
    1 - (ads.embedding <=> query_embedding) as similarity
  FROM account_data_sources ads
  WHERE ads.id != query_document_id
    AND ads.embedding IS NOT NULL
    AND 1 - (ads.embedding <=> query_embedding) > similarity_threshold
  ORDER BY ads.embedding <=> query_embedding
  LIMIT limit_count;
END;
$$;

-- Function to generate document relationships
CREATE OR REPLACE FUNCTION generate_document_relationships(
  account_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  source_id UUID,
  target_id UUID,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH document_pairs AS (
    SELECT 
      d1.id as source_id,
      d2.id as target_id,
      1 - (d1.embedding <=> d2.embedding) as similarity
    FROM account_data_sources d1
    CROSS JOIN account_data_sources d2
    WHERE d1.id < d2.id  -- Avoid duplicates
      AND d1.embedding IS NOT NULL
      AND d2.embedding IS NOT NULL
      AND (account_id_param IS NULL OR d1.account_id = account_id_param)
      AND (account_id_param IS NULL OR d2.account_id = account_id_param)
  )
  SELECT * FROM document_pairs
  WHERE similarity > 0.75  -- Only strong relationships
  ORDER BY similarity DESC;
END;
$$;
```

## Phase 3: Frontend Updates

### 3.1 Update Mock Data Generator

Replace the mock relationship generation in `mockDataGenerator.js`:

```javascript
export class RealGraphDataGenerator {
  constructor(documents, relationships) {
    this.documents = documents;
    this.relationships = relationships; // Real similarity data
  }

  generateGraph() {
    const nodes = this.createNodes();
    const links = this.createRealLinks();
    const clusters = this.detectClusters();
    
    return { nodes, links, clusters };
  }

  createRealLinks() {
    return this.relationships.map(rel => ({
      source: rel.source_id,
      target: rel.target_id,
      value: rel.similarity,
      type: this.getLinkType(rel.similarity)
    }));
  }

  getLinkType(similarity) {
    if (similarity > 0.95) return 'strong';
    if (similarity > 0.85) return 'medium';
    return 'weak';
  }

  detectClusters() {
    // Use community detection algorithm
    // Group highly connected documents
    const clusters = [];
    
    // Implementation of Louvain algorithm or similar
    // This identifies document clusters based on relationships
    
    return clusters;
  }
}
```

### 3.2 Update KnowledgeGraph Component

Modify the data fetching in `KnowledgeGraph.jsx`:

```javascript
// Add relationship fetching
useEffect(() => {
  const fetchGraphData = async () => {
    try {
      setLoading(true);
      
      // Fetch documents (existing code)
      const filteredDocs = documents.filter(doc => {
        const isGlobal = knowledgeStorage.isGlobal(doc.id);
        if (viewMode === 'global') return isGlobal;
        if (viewMode === 'account') return !isGlobal;
        return true;
      });
      
      // NEW: Fetch real relationships
      const { data: relationships, error } = await supabase
        .rpc('generate_document_relationships', {
          account_id_param: accountId === 'global' ? null : accountId
        });
        
      if (error) throw error;
      
      // Generate graph with real data
      const generator = new RealGraphDataGenerator(filteredDocs, relationships);
      const data = generator.generateGraph();
      
      setGraphData(data);
    } catch (err) {
      console.error('Error loading graph:', err);
      // Fallback to mock data
      const generator = new MockKnowledgeGraphGenerator(filteredDocs);
      setGraphData(generator.generateMockGraph());
    } finally {
      setLoading(false);
    }
  };
  
  fetchGraphData();
}, [documents, viewMode, accountId]);
```

### 3.3 Add Semantic Features

Update the node details panel to show semantic information:

```javascript
// In NodeDetails component
const NodeDetails = ({ node, onClose, relatedNodes = [] }) => {
  const [semanticInfo, setSemanticInfo] = useState(null);
  
  useEffect(() => {
    // Fetch semantic analysis
    const fetchSemanticInfo = async () => {
      const { data } = await supabase
        .from('account_data_sources')
        .select('metadata')
        .eq('id', node.id)
        .single();
        
      if (data?.metadata?.semantic_summary) {
        setSemanticInfo(data.metadata.semantic_summary);
      }
    };
    
    fetchSemanticInfo();
  }, [node.id]);
  
  return (
    <div className="node-details glass-panel">
      {/* Existing content */}
      
      {semanticInfo && (
        <div className="semantic-info">
          <h4>AI Analysis</h4>
          <p>{semanticInfo}</p>
        </div>
      )}
      
      {relatedNodes.length > 0 && (
        <div className="related-nodes">
          <h4>Similar Documents (by content)</h4>
          {relatedNodes.map(related => (
            <div key={related.id} className="related-node">
              <span>{related.name}</span>
              <span className="similarity">
                {Math.round(related.similarity * 100)}% similar
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Phase 4: Processing Pipeline

### 4.1 Document Processing Enhancement

Update `documentProcessor.js` to generate embeddings:

```javascript
// Add to processFile method
async processFile(file, progressCallback) {
  // Existing processing...
  
  // Generate embedding for the content
  if (this.embeddingService) {
    progressCallback(90, 'Generating semantic embedding...');
    
    const embedding = await this.embeddingService.generateEmbedding(
      result.text || result.html
    );
    
    result.embedding = embedding;
  }
  
  return result;
}
```

### 4.2 Batch Processing for Existing Documents

Create a utility to process existing documents:

```javascript
// src/utils/batchEmbeddingProcessor.js
export async function processExistingDocuments() {
  const embeddingService = new EmbeddingService(process.env.OPENAI_API_KEY);
  
  // Fetch documents without embeddings
  const { data: documents } = await supabase
    .from('account_data_sources')
    .select('id, content')
    .is('embedding', null)
    .limit(100);
    
  console.log(`Processing ${documents.length} documents...`);
  
  for (const doc of documents) {
    await embeddingService.updateDocumentEmbedding(doc.id, doc.content);
    console.log(`Processed ${doc.id}`);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}
```

## Phase 5: Advanced Features

### 5.1 Semantic Search

Add semantic search capability:

```javascript
// src/components/KnowledgeGraph/SemanticSearch.jsx
export function SemanticSearch({ onResultsFound }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  
  const handleSearch = async () => {
    setSearching(true);
    
    try {
      // Generate embedding for search query
      const queryEmbedding = await embeddingService.generateEmbedding(query);
      
      // Search using vector similarity
      const { data } = await supabase
        .rpc('semantic_search', {
          query_embedding: queryEmbedding,
          limit_count: 10
        });
        
      onResultsFound(data);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };
  
  return (
    <div className="semantic-search">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by meaning..."
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
      />
      <button onClick={handleSearch} disabled={searching}>
        {searching ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
}
```

### 5.2 Intelligent Clustering

Enhance the graph with automatic clustering:

```javascript
// Add to graph visualization
const clusterBySemantics = useCallback(() => {
  // Use force simulation to cluster similar documents
  if (graphRef.current) {
    graphRef.current.d3Force('cluster', forceCluster()
      .strength(0.5)
      .centers(node => {
        // Group by semantic similarity
        return clusterCenters[node.clusterId];
      })
    );
    
    graphRef.current.d3ReheatSimulation();
  }
}, [clusterCenters]);
```

## Migration Checklist

- [ ] **Phase 1**: Apply database migration and enable pgvector
- [ ] **Phase 2**: Implement embedding service and Supabase functions
- [ ] **Phase 3**: Update frontend to use real relationships
- [ ] **Phase 4**: Process existing documents to generate embeddings
- [ ] **Phase 5**: Add advanced features (semantic search, clustering)

## Performance Considerations

1. **Embedding Generation**: Rate limit API calls to avoid throttling
2. **Vector Search**: Use appropriate index parameters for your dataset size
3. **Caching**: Cache relationship data to reduce database queries
4. **Batch Processing**: Process embeddings in batches during off-peak hours

## Testing Strategy

1. **Unit Tests**: Test embedding generation and similarity calculations
2. **Integration Tests**: Verify graph updates with real relationships
3. **Performance Tests**: Ensure graph remains responsive with large datasets
4. **A/B Testing**: Compare user engagement between mock and real relationships

## Rollback Plan

If issues arise:
1. Comment out RAG-specific code
2. Revert to `MockKnowledgeGraphGenerator`
3. Keep embeddings in database for future use
4. Monitor and fix issues before re-enabling

## Success Metrics

- Graph shows meaningful document relationships
- Users discover relevant documents they weren't aware of
- Reduced time to find related content
- Improved document reuse across accounts

## Estimated Timeline

- **Week 1**: Database setup and embedding service
- **Week 2**: Frontend integration and testing
- **Week 3**: Batch processing existing documents
- **Week 4**: Advanced features and optimization

## Resources

- [OpenAI Embeddings Guide](https://platform.openai.com/docs/guides/embeddings)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Force-Directed Graph Best Practices](https://observablehq.com/@d3/force-directed-graph) 