# Knowledge Graph System Design

## ⚠️ REVISED: Frontend-Only Implementation

This design has been updated to work **without any Supabase backend changes**. All features are implemented using frontend storage and client-side processing.

## System Architecture

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ ProspectDetail  │  │  Dashboard   │  │  KnowledgeGraph│  │
│  │     Page        │  │    Page      │  │   Component    │  │
│  └────────┬────────┘  └──────┬───────┘  └───────┬────────┘  │
│           │                   │                   │           │
│  ┌────────┴──────────────────┴───────────────────┴────────┐  │
│  │                 Frontend Services                        │  │
│  ├─────────────────┬──────────────────┬───────────────────┤  │
│  │ knowledgeStorage│ mockDataGenerator│ relationshipCache │  │
│  │  (localStorage) │   (JavaScript)   │  (sessionStorage) │  │
│  └─────────────────┴──────────────────┴───────────────────┘  │
│                              │                                 │
│  ┌───────────────────────────┴─────────────────────────────┐  │
│  │              Existing Supabase (No Changes)              │  │
│  │  ┌─────────────────────────────────────────────────────┐│  │
│  │  │           account_data_sources table                 ││  │
│  │  │         (existing schema unchanged)                  ││  │
│  │  └─────────────────────────────────────────────────────┘│  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Core Components
```
src/components/KnowledgeGraph/
├── KnowledgeGraph.jsx          # Main 2D graph component
├── KnowledgeGraph.css          # Glassmorphic styles
├── components/
│   ├── GraphControls.jsx       # Zoom, pan, reset controls
│   ├── NodeDetails.jsx         # Node information panel
│   ├── DragPreview.jsx         # File drop preview
│   ├── GraphLoadingState.jsx   # Loading animation
│   └── GraphErrorBoundary.jsx  # Error handling
├── hooks/
│   ├── useGraphControls.js     # Control interactions
│   ├── useGraphRealtime.js     # Supabase subscriptions
│   └── useGraphPerformance.js  # FPS monitoring
└── index.js                    # Clean exports
```

#### Supporting Services
```
src/services/knowledgeGraph/
└── mockDataGenerator.js        # JavaScript mock data (NO TypeScript!)

src/utils/
└── knowledgeStorage.js         # Frontend-only global markers
```

## Data Models

### Frontend-Only Data Structures

#### Document Node (JavaScript)
```javascript
{
  id: "doc-uuid",
  name: "document.pdf",
  type: "document",
  __nodeData: {  // DO NOT modify directly!
    fileType: "application/pdf",
    uploadDate: "2024-01-15T10:00:00Z",
    accountId: "account-uuid",
    isGlobal: false,  // Stored in localStorage
    color: "#ef4444",
    size: 10
  }
}
```

#### Knowledge Storage (localStorage)
```javascript
// Key: 'se_auto_global_knowledge'
// Value: ["doc-id-1", "doc-id-2", ...]  // Array of global doc IDs
```

#### Relationship Cache (sessionStorage)
```javascript
// Key: 'se_auto_doc_relationships_${accountId}'
// Value: {
//   relationships: [{source: "id1", target: "id2", value: 0.8}],
//   timestamp: 1705320000000
// }
```

## Feature Specifications

### 1. Interactive 2D Visualization

#### Technology Stack
- **react-force-graph-2d** v1.23+ (NOT 3D!)
- **d3-force** for physics simulation
- **Canvas API** for custom rendering

#### Key Features
- Force-directed layout
- Custom node rendering with state-based styling
- Smooth pan/zoom with touch support
- Node dragging with position persistence
- NO direct node property modifications

### 2. Dual Placement Strategy

#### ProspectDetailPage Integration
```javascript
// Toggle between views
const [viewMode, setViewMode] = useState('list'); // or 'graph'

// Persist preference
localStorage.setItem(`viewMode_${accountId}`, viewMode);
```

#### AccountDashboard Integration
```javascript
// Show global knowledge
const globalIds = knowledgeStorage.getGlobalDocuments();
// Fetch documents with those IDs from Supabase
```

### 3. Frontend-Only Global Knowledge

#### Implementation
```javascript
export const knowledgeStorage = {
  markAsGlobal(documentId) {
    const globals = this.getGlobalDocuments();
    if (!globals.includes(documentId)) {
      globals.push(documentId);
      localStorage.setItem(GLOBAL_KNOWLEDGE_KEY, JSON.stringify(globals));
    }
  },
  
  isGlobal(documentId) {
    return this.getGlobalDocuments().includes(documentId);
  }
};
```

### 4. Performance Optimizations

#### Strategies
1. **React State Management**: All interactions via state, not DOM
2. **Debounced Updates**: Batch graph recalculations
3. **Viewport Culling**: Only render visible nodes
4. **Web Workers**: Optional for heavy calculations
5. **Canvas Optimization**: Single draw call per frame

#### Performance Targets
- 60fps with 100 nodes (required)
- 30fps with 1000 nodes (acceptable)
- < 2s initial load time
- < 100MB memory usage

### 5. Real-time Updates

#### Supabase Integration (Read-Only)
```javascript
// Subscribe to document changes
const channel = supabase
  .channel(`account-${accountId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'account_data_sources',
    filter: `account_id=eq.${accountId}`
  }, handleDocumentChange)
  .subscribe();
```

## User Interactions

### Core Interactions
1. **Hover**: Highlight node + connections (React state)
2. **Click**: Open details panel
3. **Drag Node**: Reposition and save
4. **Drag File**: Upload with preview
5. **Zoom/Pan**: Standard controls
6. **Search**: Filter visible nodes
7. **Mark Global**: Frontend-only flag

### Keyboard Shortcuts
- `Space`: Reset view
- `Escape`: Close panels
- `Ctrl/Cmd + F`: Focus search
- `+/-`: Zoom in/out

## Implementation Phases

### Phase 1: Basic 2D Graph (Days 1-3)
- [x] Install dependencies
- [x] Create mock data generator
- [x] Build graph component
- [x] Integrate into pages

### Phase 2: Frontend Storage (Days 4-6)
- [x] localStorage for globals
- [x] sessionStorage for cache
- [x] Client-side relationships

### Phase 3: Polish (Days 7-9)
- [x] Performance monitoring
- [x] Error boundaries
- [x] Accessibility
- [x] Premium styling

### Phase 4: Future (Post-MVP)
- [ ] OpenAI embeddings
- [ ] Vector similarity
- [ ] Advanced clustering

## Error Handling

### Strategies
1. **Error Boundaries**: Catch React errors
2. **Fallback UI**: Show list view on graph failure
3. **Graceful Degradation**: Work without Web Workers
4. **User Feedback**: Clear error messages

### Common Issues
- Missing dependencies → Install prompt
- Large datasets → Performance warning
- Browser compatibility → Feature detection

## Security Considerations

### Frontend Security
- Validate all user inputs
- Sanitize file names
- Limit upload sizes
- Rate limit API calls

### Data Privacy
- No sensitive data in localStorage
- Clear session data on logout
- Respect document permissions

## Testing Strategy

### Unit Tests
- Component rendering
- State management
- Storage operations
- Error scenarios

### Integration Tests
- Page integration
- Real-time updates
- File uploads
- Performance limits

### E2E Tests
- Complete user flows
- Multi-tab synchronization
- Error recovery

## Deployment Considerations

### Build Optimization
```javascript
// Lazy load the graph component
const KnowledgeGraph = lazy(() => import('./KnowledgeGraph'));

// Code split the worker
new Worker(new URL('./worker.js', import.meta.url));
```

### Performance Monitoring
- Track FPS in production
- Monitor bundle size
- Log error rates
- Measure interaction times

## Maintenance and Evolution

### Future Enhancements
1. **Embeddings**: When OpenAI integrated
2. **Vector Search**: When pgvector enabled
3. **Collaboration**: Multi-user cursors
4. **Export**: Save as image/data
5. **Analytics**: Usage insights

### Migration Path
When ready for backend changes:
1. Move global flags to database
2. Store relationships permanently  
3. Add vector embeddings
4. Enable similarity search

## Success Criteria

### Technical
- ✅ 60fps with 100 nodes
- ✅ No backend changes required
- ✅ Works in all modern browsers
- ✅ Accessible (WCAG 2.1 AA)

### Business
- ✅ Increases engagement
- ✅ Improves document discovery
- ✅ Enhances demo impact
- ✅ Zero deployment friction

This frontend-only design delivers immediate value while laying the foundation for future AI-powered enhancements. 