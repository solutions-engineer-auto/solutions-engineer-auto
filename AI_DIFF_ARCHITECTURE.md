# AI Diff System - Technical Architecture

## Executive Summary

This document outlines the technical architecture for implementing an AI-powered document editing system with diff-style accept/reject functionality. The system allows users to request targeted AI edits while maintaining full control over changes through a visual diff interface.

## System Overview

### Core Principles
1. **Non-destructive editing**: Original content always preserved
2. **Surgical precision**: AI edits only targeted sections
3. **User sovereignty**: Every change is reviewable and reversible
4. **Real-time collaboration**: Changes sync across all clients
5. **Audit trail**: Complete history of all changes

## Architecture Separation

### Frontend Responsibilities (Our Team)
- Text selection and context extraction
- Diff visualization and UI rendering
- Change state management
- User interactions (accept/reject)
- API request formatting

### Backend Responsibilities (Other Team)
- Supabase database operations
- LangGraph agent communication
- AI response processing
- Real-time subscriptions
- API endpoint implementation

## Architecture Diagram

The system uses a Vercel → Supabase split architecture for optimal performance:

```
1. Frontend (React + TipTap) → Vercel Functions (API)
2. Vercel Functions → LangGraph (AI Processing)
3. Vercel Functions → Supabase (Data Storage)
4. Supabase → Frontend (Real-time Updates)
```

This pattern provides:
- Non-blocking AI requests
- Progressive change delivery
- Better error handling
- Superior timeout management

## Data Models

### 1. Document Changes Table
```sql
CREATE TABLE document_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  change_type VARCHAR(20) NOT NULL, -- 'addition', 'deletion', 'modification'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  
  -- Position tracking using TipTap/ProseMirror positions
  start_pos INTEGER NOT NULL,
  end_pos INTEGER NOT NULL,
  paragraph_index INTEGER,
  
  -- Content
  original_content TEXT,
  suggested_content TEXT,
  
  -- Metadata
  ai_model VARCHAR(50),
  prompt_context TEXT,
  reasoning TEXT,
  confidence_score DECIMAL(3,2),
  
  -- Tracking
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  
  -- Versioning
  version INTEGER DEFAULT 1,
  parent_change_id UUID REFERENCES document_changes(id)
);

-- Indexes for performance
CREATE INDEX idx_document_changes_document_id ON document_changes(document_id);
CREATE INDEX idx_document_changes_status ON document_changes(status);
CREATE INDEX idx_document_changes_position ON document_changes(document_id, start_pos, end_pos);
```

### 2. Change Batches Table
```sql
CREATE TABLE change_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  title VARCHAR(255),
  description TEXT,
  ai_session_id VARCHAR(255),
  total_changes INTEGER DEFAULT 0,
  accepted_changes INTEGER DEFAULT 0,
  rejected_changes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE batch_changes (
  batch_id UUID REFERENCES change_batches(id) ON DELETE CASCADE,
  change_id UUID REFERENCES document_changes(id) ON DELETE CASCADE,
  PRIMARY KEY (batch_id, change_id)
);
```

### 3. Document Snapshots Table
```sql
CREATE TABLE document_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  snapshot_type VARCHAR(50), -- 'before_ai_edit', 'after_batch_apply'
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Core Components

### 1. Change Manager (Frontend)
```typescript
interface ChangeManager {
  // Track changes in the editor
  trackChange(change: DocumentChange): void;
  
  // Apply/reject changes
  applyChange(changeId: string): Promise<void>;
  rejectChange(changeId: string): Promise<void>;
  
  // Batch operations
  applyBatch(batchId: string): Promise<void>;
  rejectBatch(batchId: string): Promise<void>;
  
  // Position management
  updatePositions(transaction: Transaction): void;
  mapPosition(pos: number, mapping: Mapping): number;
}
```

### 2. AI Context Builder
```typescript
interface AIContextBuilder {
  // Build targeted context for AI
  buildContext(selection: Selection, editor: Editor): AIContext;
  
  // Quarantine strategies
  quarantineWord(selection: Selection): QuarantineZone;
  quarantineSentence(selection: Selection): QuarantineZone;
  quarantineParagraph(selection: Selection): QuarantineZone;
  quarantineSection(selection: Selection): QuarantineZone;
}

interface QuarantineZone {
  content: string;
  boundaries: { start: number; end: number };
  type: 'word' | 'sentence' | 'paragraph' | 'section';
  readOnlyContext: {
    before: string;
    after: string;
  };
}
```

### 3. Diff Visualizer (TipTap Extension)
```typescript
class DiffVisualizerExtension extends Extension {
  // Marks for different change types
  static marks = {
    addition: { class: 'diff-addition', tag: 'ins' },
    deletion: { class: 'diff-deletion', tag: 'del' },
    modification: { class: 'diff-modification', tag: 'mark' }
  };
  
  // Decorations for pending changes
  decoratePendingChanges(changes: DocumentChange[]): DecorationSet;
  
  // Interactive elements
  createChangeWidget(change: DocumentChange): Widget;
  
  // Event handlers
  onChangeHover(change: DocumentChange): void;
  onChangeClick(change: DocumentChange): void;
}
```

### 4. LangGraph Agent Enhancement
```python
from typing import Dict, List, Tuple
from langchain.schema import BaseMessage

class TargetedEditAgent:
    """Enhanced LangGraph agent for surgical document edits"""
    
    def __init__(self):
        self.edit_modes = {
            'word': self.edit_word,
            'sentence': self.edit_sentence,
            'paragraph': self.edit_paragraph,
            'section': self.edit_section
        }
    
    async def process_edit_request(
        self, 
        quarantine_zone: Dict,
        instruction: str,
        document_context: Dict
    ) -> Tuple[str, str]:
        """
        Process targeted edit request
        Returns: (edited_content, reasoning)
        """
        # Validate quarantine zone
        if not self._validate_quarantine(quarantine_zone):
            raise ValueError("Invalid quarantine zone")
        
        # Select appropriate edit mode
        edit_mode = self.edit_modes[quarantine_zone['type']]
        
        # Generate targeted edit
        result = await edit_mode(
            content=quarantine_zone['content'],
            instruction=instruction,
            context=quarantine_zone['readOnlyContext']
        )
        
        # Validate output bounds
        if not self._validate_output(result, quarantine_zone):
            raise ValueError("Edit exceeded boundaries")
        
        return result['content'], result['reasoning']
```

## API Endpoints

### 1. Suggest Changes Endpoint
```typescript
POST /api/ai/suggest-changes
{
  documentId: string;
  selection: {
    start: number;
    end: number;
    content: string;
  };
  instruction: string;
  mode: 'word' | 'sentence' | 'paragraph' | 'section';
}

Response:
{
  batchId: string;
  changes: [{
    id: string;
    type: 'addition' | 'deletion' | 'modification';
    original: string;
    suggested: string;
    reasoning: string;
    position: { start: number; end: number };
  }];
}
```

### 2. Apply/Reject Change Endpoint
```typescript
POST /api/changes/:changeId/apply
POST /api/changes/:changeId/reject

Response:
{
  success: boolean;
  documentContent?: string; // Updated content after apply
  remainingChanges: number;
}
```

### 3. Get Changes Endpoint
```typescript
GET /api/documents/:documentId/changes?status=pending

Response:
{
  changes: DocumentChange[];
  batches: ChangeBatch[];
  stats: {
    pending: number;
    accepted: number;
    rejected: number;
  };
}
```

## Real-time Synchronization

### Supabase Realtime Integration
```typescript
// Subscribe to change updates
const subscription = supabase
  .channel(`document:${documentId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'document_changes',
    filter: `document_id=eq.${documentId}`
  }, (payload) => {
    handleChangeUpdate(payload);
  })
  .subscribe();

// Broadcast cursor positions for collaborative awareness
const broadcast = supabase.channel(`cursor:${documentId}`)
  .on('presence', { event: 'sync' }, () => {
    const state = broadcast.presenceState();
    updateCollaboratorCursors(state);
  })
  .subscribe();
```

## Security Considerations

### 1. Input Validation
- Sanitize all user inputs before sending to AI
- Validate position boundaries
- Check document ownership

### 2. AI Output Validation
- Enforce token limits
- Validate response structure
- Check for boundary violations
- Scan for injection attempts

### 3. Rate Limiting
```typescript
const rateLimiter = {
  aiRequests: '10 per minute per user',
  changeApplications: '100 per minute per document',
  batchOperations: '5 per minute per user'
};
```

## Performance Optimizations

### 1. Change Batching
- Group related changes for efficient processing
- Implement optimistic updates
- Use database transactions for consistency

### 2. Position Mapping Cache
```typescript
class PositionCache {
  private cache: Map<string, MappedPosition>;
  
  mapPosition(pos: number, changes: DocumentChange[]): number {
    const cacheKey = `${pos}:${changes.map(c => c.id).join(',')}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const mapped = this.calculateMapping(pos, changes);
    this.cache.set(cacheKey, mapped);
    return mapped;
  }
}
```

### 3. Diff Calculation Optimization
- Use diff-match-patch for efficient text comparison
- Cache diff results for repeated operations
- Implement virtual scrolling for large change sets

## Monitoring and Analytics

### Key Metrics
1. **Precision Rate**: Changes affecting only intended sections
2. **Acceptance Rate**: Percentage of AI suggestions accepted
3. **Time to Decision**: Average time to review changes
4. **Revert Rate**: Changes reverted after initial acceptance
5. **AI Model Performance**: Comparison across different models

### Tracking Implementation
```sql
CREATE TABLE change_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  change_id UUID REFERENCES document_changes(id),
  event_type VARCHAR(50), -- 'viewed', 'accepted', 'rejected', 'reverted'
  event_metadata JSONB,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Error Handling

### Graceful Degradation
1. **AI Service Unavailable**: Fall back to local-only editing
2. **Position Mapping Errors**: Preserve original content
3. **Sync Conflicts**: Implement CRDT-based resolution
4. **Rate Limit Exceeded**: Queue requests with user notification

## Testing Strategy

### Unit Tests
- Position mapping accuracy
- Change boundary validation
- Diff generation correctness

### Integration Tests
- AI response processing
- Real-time synchronization
- Multi-user scenarios

### E2E Tests
- Complete edit workflows
- Collaborative editing scenarios
- Performance under load

## Future Enhancements

1. **Smart Conflict Resolution**: ML-based merge conflict resolution
2. **Predictive Editing**: Anticipate user's next edit based on patterns
3. **Semantic Versioning**: Track meaningful document versions
4. **Advanced Analytics**: Edit pattern analysis and optimization
5. **Plugin Architecture**: Extensible system for custom edit types 