# Knowledge Graph Quick Reference

## 🚨 CRITICAL: Avoid These Issues

### ❌ DO NOT:
1. Create TypeScript files (`.ts`, `.tsx`) - This is a JavaScript project
2. Use `react-force-graph-3d` or `three.js` - WebGPU errors
3. Modify node properties directly - Causes freezing
4. Make any Supabase database changes - Frontend-only
5. Skip dependency installation - Causes 404 errors

### ✅ MUST DO:
1. Install dependencies FIRST: `npm install --save react-force-graph-2d@1.23.0 d3-force@3.0.0 uuid@9.0.0`
2. Use JavaScript only (`.js`, `.jsx`)
3. Use React state for ALL interactions
4. Store global markers in localStorage
5. Test for freezing after every change

## File Structure

```
src/
├── components/
│   └── KnowledgeGraph/
│       ├── KnowledgeGraph.jsx          # Main 2D component
│       ├── KnowledgeGraph.css          # Glassmorphic styles
│       ├── components/
│       │   ├── GraphControls.jsx       # Zoom controls
│       │   ├── NodeDetails.jsx         # Details panel
│       │   └── DragPreview.jsx         # Drop preview
│       ├── hooks/
│       │   ├── useGraphControls.js     # Control logic
│       │   ├── useGraphRealtime.js     # Subscriptions
│       │   └── useGraphPerformance.js  # FPS monitor
│       └── index.js                    # Exports
├── services/
│   └── knowledgeGraph/
│       └── mockDataGenerator.js        # Mock data (JS!)
└── utils/
    └── knowledgeStorage.js             # localStorage API
```

## Core Component Pattern

```javascript
// KnowledgeGraph.jsx - CRITICAL patterns

import ForceGraph2D from 'react-force-graph-2d'; // 2D ONLY!

const KnowledgeGraph = ({ documents, accountId, viewMode }) => {
  // CRITICAL: Use state for ALL interactive properties
  const [highlightedNodeId, setHighlightedNodeId] = useState(null);
  
  // CRITICAL: Handle hover WITHOUT modifying nodes
  const handleNodeHover = useCallback((node) => {
    setHighlightedNodeId(node ? node.id : null);
  }, []);
  
  // CRITICAL: Custom rendering with state-based styling
  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHighlighted = node.id === highlightedNodeId;
    // Draw based on state, don't modify node
  }, [highlightedNodeId]);
  
  return (
    <ForceGraph2D
      graphData={graphData}
      nodeCanvasObject={nodeCanvasObject}
      onNodeHover={handleNodeHover}
      // NO nodeThreeObject - that's 3D!
    />
  );
};
```

## Frontend Storage Pattern

```javascript
// knowledgeStorage.js
export const knowledgeStorage = {
  markAsGlobal(documentId) {
    const globals = this.getGlobalDocuments();
    if (!globals.includes(documentId)) {
      globals.push(documentId);
      localStorage.setItem('se_auto_global_knowledge', JSON.stringify(globals));
    }
  },
  
  isGlobal(documentId) {
    return this.getGlobalDocuments().includes(documentId);
  }
};
```

## Mock Data Generator Pattern

```javascript
// mockDataGenerator.js - NO TypeScript!
export class MockKnowledgeGraphGenerator {
  constructor(documents, seed) {
    this.documents = documents;
    this.rngSeed = seed;
  }
  
  generateMockGraph() {
    const nodes = this.documents.map(doc => ({
      id: doc.id,
      name: doc.file_name,
      __nodeData: { // Don't modify at runtime!
        color: this.getColorByType(doc.file_type),
        size: 10
      }
    }));
    
    return { nodes, links: this.createLinks(nodes) };
  }
}
```

## Integration Patterns

### ProspectDetailPage
```javascript
// Toggle view mode
const [viewMode, setViewMode] = useState('list');

// Persist preference
localStorage.setItem(`viewMode_${accountId}`, viewMode);

// Render graph
{viewMode === 'graph' && (
  <Suspense fallback={<div>Loading...</div>}>
    <KnowledgeGraph 
      documents={documents}
      accountId={accountId}
      viewMode="account"
    />
  </Suspense>
)}
```

### AccountDashboard
```javascript
// Get global documents
const globalIds = knowledgeStorage.getGlobalDocuments();
const { data } = await supabase
  .from('account_data_sources')
  .select('*')
  .in('id', globalIds);

// Show global graph
<KnowledgeGraph 
  documents={globalDocuments}
  accountId="global"
  viewMode="global"
/>
```

## Common Fixes

### Issue: Graph freezes on hover
```javascript
// ❌ WRONG - Modifying node directly
const handleHover = (node) => {
  node.color = '#ff0000'; // CAUSES FREEZING!
};

// ✅ CORRECT - Use React state
const [hoveredId, setHoveredId] = useState(null);
const handleHover = (node) => {
  setHoveredId(node?.id);
};
```

### Issue: TypeScript errors
```javascript
// ❌ WRONG - TypeScript syntax
interface GraphData {
  nodes: Node[];
}

// ✅ CORRECT - JavaScript JSDoc
/**
 * @typedef {Object} GraphData
 * @property {Array} nodes
 */
```

### Issue: 404 errors on load
```bash
# ❌ WRONG - Running without dependencies
npm run dev

# ✅ CORRECT - Install first
npm install --save react-force-graph-2d@1.23.0 d3-force@3.0.0 uuid@9.0.0
npm run dev
```

## Performance Checklist

- [ ] Using 2D graph (not 3D)
- [ ] React state for all interactions
- [ ] No direct node modifications
- [ ] Dependencies installed
- [ ] JavaScript files only
- [ ] localStorage for global flags
- [ ] Lazy loading with Suspense
- [ ] Custom canvas rendering
- [ ] Debounced updates
- [ ] Error boundaries

## Quick Commands

```bash
# Install dependencies
npm install --save react-force-graph-2d@1.23.0 d3-force@3.0.0 uuid@9.0.0

# Check for TypeScript files (should return nothing)
find src -name "*.ts" -o -name "*.tsx"

# Start development
npm run dev

# Test in browser
# 1. Go to any account
# 2. Toggle to graph view
# 3. Verify no freezing on hover
# 4. Check console for errors
```

## Emergency Fixes

If the app won't load:
1. Check for 404 errors in console
2. Run: `npm install --save react-force-graph-2d@1.23.0`
3. Delete any `.ts` files
4. Clear browser cache

If graph freezes:
1. Search for direct node modifications
2. Replace with React state
3. Check nodeCanvasObject callback

If TypeScript errors:
1. Rename `.ts` → `.js`
2. Remove interfaces/types
3. Use JSDoc comments instead 