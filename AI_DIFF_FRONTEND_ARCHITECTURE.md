# AI Diff System - Frontend Architecture & API Contracts

## Executive Summary

This document defines the frontend architecture for the AI diff system and establishes clear API contracts with the backend team. Our responsibility is to build the UI/UX layer for text selection, diff visualization, and change management, while the backend team handles Supabase integration and LangGraph communication.

**Architecture Pattern**: We use a Vercel → Supabase split architecture where:
- Frontend sends AI requests to Vercel Functions
- Vercel processes requests with LangGraph and stores results in Supabase
- Frontend receives real-time updates via Supabase subscriptions

## Division of Responsibilities

### Frontend Team (Our Scope)
1. **Text Selection & Context Extraction**
   - Implement TipTap selection handling
   - Build context extraction logic
   - Create quarantine zone boundaries

2. **Diff Visualization**
   - TipTap extension for diff rendering
   - Interactive change widgets
   - Accept/reject UI components

3. **State Management**
   - Local change tracking
   - Optimistic updates
   - UI state coordination

4. **API Integration**
   - Request formatting
   - Response handling
   - Error management

### Backend Team (Their Scope)
1. **Database Operations**
   - All Supabase interactions
   - Data persistence
   - Real-time subscriptions

2. **AI Processing**
   - LangGraph agent communication
   - Response validation
   - Error handling

3. **API Implementation**
   - Vercel functions
   - Authentication
   - Rate limiting

## Frontend Architecture

### Component Hierarchy

```
DocumentEditorPage
├── TipTapEditor
│   ├── DiffExtension
│   │   ├── SelectionHandler
│   │   ├── DiffDecorations
│   │   └── ChangeWidgets
│   └── StandardExtensions
├── AIInstructionModal
│   ├── InstructionInput
│   ├── ScopeSelector
│   └── SubmitHandler
├── DiffControlPanel
│   ├── ChangeSummary
│   ├── BatchActions
│   └── NavigationControls
└── ChangeManager
    ├── StateManager
    ├── APIClient
    └── PositionTracker
```

### Core Components

#### 1. Text Selection Engine
```typescript
interface SelectionEngine {
  // Get current selection with context
  getSelection(): SelectionContext;
  
  // Extract text with boundaries
  extractText(selection: Selection): TextBoundaries;
  
  // Build quarantine zone
  buildQuarantineZone(selection: Selection, mode: QuarantineMode): QuarantineZone;
}

interface SelectionContext {
  text: string;
  from: number;
  to: number;
  $from: ResolvedPos;
  $to: ResolvedPos;
  containingNode: Node;
  nodeType: 'word' | 'sentence' | 'paragraph' | 'section';
}

interface QuarantineZone {
  targetText: string;
  boundaries: { start: number; end: number };
  readOnlyContext: {
    before: string;
    after: string;
  };
  metadata: {
    nodeType: string;
    parentPath: number[];
  };
}
```

#### 2. Diff Visualization System
```typescript
interface DiffVisualizer {
  // Apply visual changes to editor
  applyDiff(changes: Change[]): void;
  
  // Create interactive widgets
  createChangeWidget(change: Change): Widget;
  
  // Update decorations
  updateDecorations(changes: Change[]): DecorationSet;
}

// TipTap Extension Structure
class DiffExtension extends Extension {
  name = 'diff';
  
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('diff'),
        state: {
          init: () => new DiffState(),
          apply: (tr, state) => state.apply(tr)
        },
        props: {
          decorations: (state) => this.getDecorations(state),
          handleClick: (view, pos, event) => this.handleClick(view, pos, event)
        }
      })
    ];
  }
}
```

#### 3. Change State Management
```typescript
interface ChangeManager {
  // Local state
  changes: Map<string, Change>;
  
  // Track a new change
  addChange(change: Change): void;
  
  // Update change status
  updateChangeStatus(changeId: string, status: ChangeStatus): void;
  
  // Get changes for position
  getChangesAtPosition(pos: number): Change[];
  
  // Batch operations
  applyBatch(changeIds: string[]): Promise<void>;
  rejectBatch(changeIds: string[]): Promise<void>;
}

interface Change {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  status: 'pending' | 'accepted' | 'rejected';
  position: { from: number; to: number };
  originalText: string;
  suggestedText: string;
  metadata: {
    createdAt: Date;
    aiModel: string;
    confidence: number;
    reasoning: string;
  };
}
```

## API Contracts

### Request Flow Architecture

```
1. Frontend → Vercel: Initial AI request
2. Vercel → LangGraph: Process with AI
3. Vercel → Supabase: Store results
4. Supabase → Frontend: Real-time updates
```

### 1. Suggest Changes Endpoint (Vercel)

**Endpoint**: `POST /api/ai/suggest-changes`

**Request**:
```typescript
interface SuggestChangesRequest {
  documentId: string;
  selection: {
    from: number;
    to: number;
    text: string;
  };
  instruction: string;
  mode: 'word' | 'sentence' | 'paragraph' | 'section';
  context: {
    before: string;  // Text before selection
    after: string;   // Text after selection
    documentTitle: string;
    documentType: string;
  };
}
```

**Immediate Response** (from Vercel):
```typescript
interface SuggestChangesResponse {
  batchId: string;  // Used to subscribe to results
  status: 'processing';
  estimatedTime: number;  // Estimated processing time in seconds
}
```

**Real-time Updates** (via Supabase subscription):
```typescript
interface ChangeUpdate {
  batchId: string;
  change: {
    id: string;
    type: 'addition' | 'deletion' | 'modification';
    position: { from: number; to: number };
    originalText: string;
    suggestedText: string;
    confidence: number;
    reasoning: string;
  };
  metadata?: {
    aiModel: string;
    processingTime: number;
    tokensUsed: number;
  };
}
```

**Error Response**:
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 2. Apply Change Endpoint

**Endpoint**: `POST /api/changes/:changeId/apply`

**Request**: No body required (uses changeId from URL)

**Response**:
```typescript
interface ApplyChangeResponse {
  success: boolean;
  change: {
    id: string;
    status: 'accepted';
    appliedAt: Date;
  };
  document: {
    version: number;
    lastModified: Date;
  };
}
```

### 3. Reject Change Endpoint

**Endpoint**: `POST /api/changes/:changeId/reject`

**Request**: No body required

**Response**:
```typescript
interface RejectChangeResponse {
  success: boolean;
  change: {
    id: string;
    status: 'rejected';
    rejectedAt: Date;
  };
}
```

### 4. Get Changes Endpoint

**Endpoint**: `GET /api/documents/:documentId/changes`

**Query Parameters**:
- `status`: 'pending' | 'accepted' | 'rejected' | 'all'
- `batchId`: string (optional)
- `limit`: number (default: 100)
- `offset`: number (default: 0)

**Response**:
```typescript
interface GetChangesResponse {
  changes: Change[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
  batches: Array<{
    id: string;
    createdAt: Date;
    changesCount: number;
    acceptedCount: number;
    rejectedCount: number;
  }>;
}
```

### 5. Supabase Subscription Management

**Subscribe to Change Batch**:
```typescript
interface SubscriptionConfig {
  channel: string;  // `changes:${batchId}`
  event: 'INSERT' | 'UPDATE' | 'DELETE';
  table: 'document_changes';
  filter: string;  // `batch_id=eq.${batchId}`
}
```

**Subscription Events**:
```typescript
// New change added to batch
interface ChangeInsertEvent {
  type: 'INSERT';
  new: {
    id: string;
    batch_id: string;
    type: 'addition' | 'deletion' | 'modification';
    position: { from: number; to: number };
    original_text: string;
    suggested_text: string;
    confidence: number;
    reasoning: string;
    created_at: string;
  };
}

// Batch completion event
interface BatchCompleteEvent {
  type: 'UPDATE';
  new: {
    id: string;
    status: 'completed' | 'failed';
    completed_at: string;
    total_changes: number;
    error?: string;
  };
}

// Change status update (accept/reject)
interface ChangeStatusEvent {
  type: 'UPDATE';
  new: {
    id: string;
    status: 'accepted' | 'rejected';
    updated_at: string;
  };
}
```

## Frontend Implementation Details

### 1. Text Selection Implementation

```javascript
// src/extensions/DiffExtension/SelectionHandler.js
export class SelectionHandler {
  constructor(editor) {
    this.editor = editor;
  }

  getQuarantineZone(mode = 'paragraph') {
    const { selection } = this.editor.state;
    const { $from, $to } = selection;
    
    switch (mode) {
      case 'word':
        return this.getWordBoundaries($from, $to);
      case 'sentence':
        return this.getSentenceBoundaries($from, $to);
      case 'paragraph':
        return this.getParagraphBoundaries($from, $to);
      case 'section':
        return this.getSectionBoundaries($from, $to);
    }
  }

  getParagraphBoundaries($from, $to) {
    const startPara = $from.node($from.depth);
    const endPara = $to.node($to.depth);
    
    // If selection spans multiple paragraphs, get the full range
    if (startPara !== endPara) {
      return {
        from: $from.start($from.depth),
        to: $to.end($to.depth),
        nodes: this.getNodesBetween($from, $to)
      };
    }
    
    // Single paragraph selection
    return {
      from: $from.start($from.depth),
      to: $from.end($from.depth),
      node: startPara
    };
  }
}
```

### 2. Diff Visualization

```javascript
// src/extensions/DiffExtension/DiffDecorations.js
export class DiffDecorations {
  static createDecorations(doc, changes) {
    const decorations = [];
    
    changes.forEach(change => {
      switch (change.type) {
        case 'addition':
          decorations.push(
            Decoration.inline(change.from, change.to, {
              class: 'diff-addition',
              nodeName: 'ins'
            })
          );
          break;
          
        case 'deletion':
          decorations.push(
            Decoration.inline(change.from, change.to, {
              class: 'diff-deletion',
              nodeName: 'del'
            })
          );
          break;
          
        case 'modification':
          decorations.push(
            Decoration.inline(change.from, change.to, {
              class: 'diff-modification',
              nodeName: 'mark'
            })
          );
          break;
      }
      
      // Add interactive widget
      decorations.push(
        Decoration.widget(change.from, () => {
          return this.createChangeWidget(change);
        }, { side: -1 })
      );
    });
    
    return DecorationSet.create(doc, decorations);
  }
}
```

### 3. Subscription Management Service

```javascript
// src/services/SubscriptionManager.js
export class SubscriptionManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.subscriptions = new Map();
  }

  async subscribeToBatch(batchId, handlers) {
    // Clean up any existing subscription for this batch
    this.unsubscribe(batchId);
    
    const channel = this.supabase
      .channel(`changes:${batchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'document_changes',
        filter: `batch_id=eq.${batchId}`
      }, handlers.onNewChange)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'change_batches',
        filter: `id=eq.${batchId}`
      }, handlers.onBatchUpdate)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'document_changes',
        filter: `batch_id=eq.${batchId}`
      }, handlers.onChangeUpdate);
    
    const subscription = await channel.subscribe();
    this.subscriptions.set(batchId, subscription);
    
    return subscription;
  }

  unsubscribe(batchId) {
    const subscription = this.subscriptions.get(batchId);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(batchId);
    }
  }

  unsubscribeAll() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.clear();
  }
}
```

### 4. Enhanced Change Manager with Real-time Support

```javascript
// src/services/ChangeManager.js
export class ChangeManager {
  constructor(supabase) {
    this.supabase = supabase;
    this.changes = new Map();
    this.batches = new Map();
    this.listeners = new Set();
  }

  // Handle incoming changes from Supabase
  handleRealtimeChange(change) {
    this.changes.set(change.id, {
      ...change,
      status: change.status || 'pending',
      createdAt: new Date(change.created_at)
    });
    this.notifyListeners('change-added', change);
  }

  // Handle batch updates
  handleBatchUpdate(batch) {
    this.batches.set(batch.id, batch);
    if (batch.status === 'completed') {
      this.notifyListeners('batch-completed', batch);
    } else if (batch.status === 'failed') {
      this.notifyListeners('batch-failed', batch);
    }
  }

  async applyChange(changeId) {
    const change = this.changes.get(changeId);
    if (!change) throw new Error('Change not found');
    
    // Optimistic update
    change.status = 'accepted';
    this.notifyListeners('change-updated', change);
    
    try {
      // Apply through Vercel API
      const response = await fetch(`/api/changes/${changeId}/apply`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        // Rollback on error
        change.status = 'pending';
        this.notifyListeners('change-updated', change);
        throw new Error('Failed to apply change');
      }
      
      // Supabase will send real-time update confirming the change
    } catch (error) {
      console.error('Error applying change:', error);
      throw error;
    }
  }

  getChangesByBatch(batchId) {
    return Array.from(this.changes.values())
      .filter(change => change.batch_id === batchId);
  }
}
```

### 4. CSS Styling

```css
/* src/styles/diff-viewer.css */
.diff-addition {
  background-color: rgba(34, 197, 94, 0.2);
  text-decoration: none;
  position: relative;
}

.diff-deletion {
  background-color: rgba(239, 68, 68, 0.2);
  text-decoration: line-through;
  opacity: 0.7;
}

.diff-modification {
  background-color: rgba(59, 130, 246, 0.2);
  border-bottom: 2px solid rgb(59, 130, 246);
}

.diff-widget {
  position: absolute;
  left: -24px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.diff-addition:hover .diff-widget,
.diff-deletion:hover .diff-widget,
.diff-modification:hover .diff-widget {
  opacity: 1;
}

.diff-accept-btn, .diff-reject-btn {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-size: 12px;
}

.diff-accept-btn {
  background: #22c55e;
  color: white;
}

.diff-reject-btn {
  background: #ef4444;
  color: white;
}
```

## Integration with Existing Editor

### 1. Editor Setup with Vercel → Supabase Pattern

```javascript
// src/pages/DocumentEditorPage.jsx
import { DiffExtension } from '../extensions/DiffExtension';
import { ChangeManager } from '../services/ChangeManager';
import { supabase } from '../supabaseClient';

const DocumentEditorPage = () => {
  const changeManager = useRef(new ChangeManager());
  const [showDiff, setShowDiff] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const subscriptionRef = useRef(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      showDiff ? DiffExtension.configure({
        changeManager: changeManager.current,
        onAccept: (changeId) => handleAcceptChange(changeId),
        onReject: (changeId) => handleRejectChange(changeId)
      }) : null
    ].filter(Boolean),
    content: document.content
  });
  
  const handleAIEdit = async (instruction) => {
    const selection = editor.state.selection;
    const selectionHandler = new SelectionHandler(editor);
    const quarantineZone = selectionHandler.getQuarantineZone();
    
    const request = {
      documentId: document.id,
      selection: {
        from: selection.from,
        to: selection.to,
        text: editor.state.doc.textBetween(selection.from, selection.to)
      },
      instruction,
      mode: 'paragraph',
      context: {
        before: quarantineZone.before,
        after: quarantineZone.after,
        documentTitle: document.title,
        documentType: document.type
      }
    };
    
    // 1. Send request to Vercel
    setIsProcessing(true);
    const response = await fetch('/api/ai/suggest-changes', {
      method: 'POST',
      body: JSON.stringify(request)
    });
    
    const { batchId } = await response.json();
    
    // 2. Subscribe to Supabase for real-time results
    subscriptionRef.current = supabase
      .channel(`changes:${batchId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'document_changes',
        filter: `batch_id=eq.${batchId}`
      }, (payload) => {
        // Handle each change as it arrives
        const change = payload.new;
        changeManager.current.addChange({
          id: change.id,
          type: change.type,
          position: { from: change.position.from, to: change.position.to },
          originalText: change.original_text,
          suggestedText: change.suggested_text,
          metadata: {
            confidence: change.confidence,
            reasoning: change.reasoning
          }
        });
        
        // Enable diff view on first change
        if (!showDiff) setShowDiff(true);
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'change_batches',
        filter: `id=eq.${batchId}`
      }, (payload) => {
        // Handle batch completion
        if (payload.new.status === 'completed') {
          setIsProcessing(false);
          subscriptionRef.current?.unsubscribe();
        } else if (payload.new.status === 'failed') {
          setIsProcessing(false);
          console.error('AI processing failed:', payload.new.error);
          // Show error to user
        }
      })
      .subscribe();
  };
  
  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      subscriptionRef.current?.unsubscribe();
    };
  }, []);
};
```

### 2. Keyboard Shortcuts

```javascript
// Add to DiffExtension
addKeyboardShortcuts() {
  return {
    'Tab': () => this.focusNextChange(),
    'Shift-Tab': () => this.focusPreviousChange(),
    'Enter': () => this.acceptFocusedChange(),
    'Escape': () => this.rejectFocusedChange(),
    'Mod-Shift-a': () => this.acceptAllChanges(),
    'Mod-Shift-r': () => this.rejectAllChanges()
  };
}
```

## Testing Strategy

### 1. Unit Tests
```javascript
// __tests__/SelectionHandler.test.js
describe('SelectionHandler', () => {
  it('should extract paragraph boundaries correctly', () => {
    const handler = new SelectionHandler(mockEditor);
    const boundaries = handler.getParagraphBoundaries($from, $to);
    expect(boundaries.from).toBe(0);
    expect(boundaries.to).toBe(100);
  });
});
```

### 2. Integration Tests
```javascript
// __tests__/DiffExtension.test.js
describe('DiffExtension', () => {
  it('should apply decorations for changes', () => {
    const changes = [
      { id: '1', type: 'addition', from: 10, to: 20 }
    ];
    const decorations = DiffDecorations.createDecorations(doc, changes);
    expect(decorations.find(10, 20).length).toBe(2); // Inline + widget
  });
});
```

## Complete Request Flow Example

```javascript
// src/hooks/useAIDiff.js
export function useAIDiff(editor, document) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState(null);
  const changeManager = useRef(new ChangeManager(supabase));
  const subscriptionManager = useRef(new SubscriptionManager(supabase));

  const requestAIChanges = async (instruction, mode = 'paragraph') => {
    try {
      setIsProcessing(true);
      
      // 1. Extract context from editor
      const selection = editor.state.selection;
      const selectionHandler = new SelectionHandler(editor);
      const quarantine = selectionHandler.getQuarantineZone(mode);
      
      // 2. Send to Vercel API
      const response = await fetch('/api/ai/suggest-changes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: document.id,
          selection: {
            from: selection.from,
            to: selection.to,
            text: editor.state.doc.textBetween(selection.from, selection.to)
          },
          instruction,
          mode,
          context: {
            before: quarantine.before,
            after: quarantine.after,
            documentTitle: document.title,
            documentType: document.type
          }
        })
      });

      if (!response.ok) throw new Error('Failed to start AI processing');
      
      const { batchId } = await response.json();
      setCurrentBatchId(batchId);
      
      // 3. Subscribe to real-time updates
      await subscriptionManager.current.subscribeToBatch(batchId, {
        onNewChange: (payload) => {
          changeManager.current.handleRealtimeChange(payload.new);
        },
        onBatchUpdate: (payload) => {
          changeManager.current.handleBatchUpdate(payload.new);
          if (['completed', 'failed'].includes(payload.new.status)) {
            setIsProcessing(false);
          }
        },
        onChangeUpdate: (payload) => {
          changeManager.current.handleChangeUpdate(payload.new);
        }
      });
      
    } catch (error) {
      console.error('Error requesting AI changes:', error);
      setIsProcessing(false);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      subscriptionManager.current.unsubscribeAll();
    };
  }, []);

  return {
    requestAIChanges,
    isProcessing,
    currentBatchId,
    changeManager: changeManager.current
  };
}
```

## Performance Considerations

1. **Progressive Loading**: Changes arrive one at a time via subscriptions
2. **Debounced Decorations**: Batch multiple changes before re-rendering
3. **Connection Pooling**: Reuse Supabase connections
4. **Optimistic Updates**: Update UI before server confirmation
5. **Virtual Scrolling**: For documents with many changes
6. **Memoization**: Cache expensive calculations

## Error Handling Strategy

### Network Errors
```javascript
// src/utils/errorHandler.js
export class DiffErrorHandler {
  static async handleAPIError(error, context) {
    if (error.name === 'NetworkError') {
      // Retry with exponential backoff
      return await this.retryWithBackoff(context.request);
    }
    
    if (error.status === 429) {
      // Rate limited - queue for later
      return await this.queueRequest(context.request);
    }
    
    if (error.status >= 500) {
      // Server error - show user message
      toast.error('AI service temporarily unavailable');
      return null;
    }
    
    // Log and report unknown errors
    console.error('Unexpected API error:', error);
    throw error;
  }
  
  static handleSubscriptionError(error, batchId) {
    console.error(`Subscription error for batch ${batchId}:`, error);
    
    // Attempt to reconnect
    setTimeout(() => {
      subscriptionManager.reconnect(batchId);
    }, 5000);
  }
}
```

### Timeout Handling
```javascript
// Handle long-running AI requests
const AI_TIMEOUT = 30000; // 30 seconds

const requestWithTimeout = async (request) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT);
  
  try {
    const response = await fetch(request.url, {
      ...request,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      toast.warning('AI request is taking longer than expected...');
      // Continue waiting via subscription
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
```

## Next Steps

1. **Implement Core Components**
   - SelectionHandler
   - DiffExtension  
   - ChangeManager
   - SubscriptionManager

2. **Create UI Components**
   - AIInstructionModal
   - DiffControlPanel
   - Change widgets
   - Loading states

3. **Integration Testing**
   - Test Vercel endpoints
   - Test Supabase subscriptions
   - Verify error handling
   - Test keyboard navigation

4. **Performance Testing**
   - Measure subscription latency
   - Test with 100+ changes
   - Optimize decoration rendering
   - Profile memory usage
