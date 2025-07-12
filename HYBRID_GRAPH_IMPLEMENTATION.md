# Hybrid Knowledge Graph Implementation

## Overview

The Knowledge Graph now uses a hybrid approach that combines:
1. **Baseline connections** - Weak connections between all nodes based on metadata
2. **RAG connections** - Strong connections based on actual content similarity

This ensures the graph always looks connected and interesting, even when RAG finds no strong relationships.

## How It Works

### Connection Types

1. **Strong RAG** (green, >80% similarity)
   - Solid, thick lines
   - Documents are very similar in content
   - Nodes are pulled close together

2. **Medium RAG** (blue, 60-80% similarity)
   - Solid, medium lines
   - Documents share significant content
   - Moderate attraction between nodes

3. **Weak RAG** (purple, 40-60% similarity)
   - Solid, thin lines
   - Some content overlap
   - Light attraction between nodes

4. **Baseline** (gray, dashed)
   - Dashed, very thin lines
   - Based on metadata (file type, date, account)
   - Ensures every node has connections
   - Very weak forces to prevent clutter

### Visual Design

- **Solid lines**: RAG connections (content-based)
- **Dashed lines**: Baseline connections (metadata-based)
- **Line thickness**: Indicates connection strength
- **Line opacity**: Stronger = more opaque
- **Node colors**: Based on file type (PDF=red, Word=blue, etc.)

### Force Simulation

The force simulation treats connections differently:
- RAG connections have strong forces (pull nodes together)
- Baseline connections have weak forces (prevent isolation)
- Distance varies by connection type (close for strong RAG, far for baseline)

## Benefits

1. **Always Connected**: Every document has at least one connection
2. **Visual Hierarchy**: Important relationships stand out
3. **Discoverable**: Weak connections hint at potential relationships
4. **Scalable**: Works well with few or many documents
5. **Intuitive**: Strong connections = similar content

## RAG Threshold

The similarity threshold slider controls which RAG connections appear:
- **Lower threshold** (0.3): More RAG connections, potentially noisy
- **Medium threshold** (0.5): Balanced, meaningful connections
- **Higher threshold** (0.7): Only very similar documents connect

## Implementation Details

### HybridGraphGenerator

```javascript
// Creates both baseline and RAG connections
const generator = new HybridGraphGenerator(documents, ragRelationships);
const { nodes, links } = generator.generateHybridGraph();
```

### Baseline Similarity Calculation

Baseline connections are created based on:
- Same file type: +0.3
- Same account: +0.2
- Created within 7 days: +0.1
- Both global documents: +0.2

Only ~30% of potential baseline connections are shown to avoid clutter.

### Minimum Connectivity

If a node has no connections at all, it gets connected to a random node with a very weak link to ensure no islands.

## Future Enhancements

1. **Clustering**: Group highly connected documents visually
2. **Filters**: Show/hide connection types
3. **Weights**: Adjust importance of different connection types
4. **Labels**: Show connection reasons on hover
5. **Analytics**: Track most connected documents 