# AI Diff System - Integration Guide

## Overview

This guide details how the AI diff system integrates with your existing SE Automation Tool architecture, specifically addressing the interaction between LangGraph agents, Supabase database, and the React/TipTap frontend.

## Architecture Pattern: Vercel → Supabase

We implement a split architecture for optimal performance:

### Request Flow
1. **Frontend → Vercel**: User initiates AI edit request
2. **Vercel → LangGraph**: Process request with AI agent
3. **Vercel → Supabase**: Store results progressively
4. **Supabase → Frontend**: Real-time updates via subscriptions

This pattern provides:
- **Non-blocking requests**: UI remains responsive during AI processing
- **Progressive updates**: Changes appear as they're generated
- **Better error handling**: Vercel can retry and manage timeouts
- **Scalability**: Can handle multiple concurrent AI requests

## Current Architecture Analysis

### Existing Components
1. **Frontend**: React + TipTap editor with document management
2. **Database**: Supabase with documents, accounts, chat_messages tables
3. **AI Integration**: LangGraph Cloud agent (currently via polling)
4. **API Layer**: Vercel Functions for LangGraph communication
5. **Real-time**: Supabase subscriptions (planned but not implemented)

### Integration Points

```
Current Flow:
User → TipTap Editor → AI Chat Panel → Vercel API → LangGraph → Supabase → Frontend

New Diff Flow:
User → TipTap Editor → Diff Manager → Vercel API → Enhanced LangGraph → Supabase (changes) → Real-time Updates → Diff Visualizer
```

## Integration Strategy

### Phase 1: Minimal Viable Integration

**Goal**: Add diff functionality without disrupting existing features

1. **Database Extensions**
   ```sql
   -- Add to existing migration structure
   -- File: supabase/migrations/20241201000000_add_diff_tables.sql
   
   -- Extends existing documents table relationship
   CREATE TABLE document_changes (
     -- ... (as defined in architecture)
     document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE
   );
   ```

2. **Frontend Enhancement**
   ```typescript
   // Extend existing DocumentEditorPage.jsx
   const DocumentEditorPage = () => {
     const [showDiffMode, setShowDiffMode] = useState(false);
     const [pendingChanges, setPendingChanges] = useState([]);
     
     // Existing editor setup
     const editor = useEditor({
       extensions: [
         StarterKit,
         // Add new diff extension
         showDiffMode ? DiffVisualizerExtension : null
       ].filter(Boolean)
     });
   };
   ```

3. **AI Chat Integration**
   ```typescript
   // Modify useAIChat.js to support diff mode
   export const useAIChat = (mode = 'mock', options = {}) => {
     const { diffMode = false, onChangeSuggested } = options;
     
     const sendMessage = useCallback(async (content, accountData = null) => {
       // Existing logic...
       
       if (diffMode && content.startsWith('/edit')) {
         // Route to diff endpoint instead
         const response = await fetch('/api/ai/suggest-changes', {
           method: 'POST',
           body: JSON.stringify({
             documentId: currentDocument.id,
             instruction: content.replace('/edit', '').trim(),
             selection: editor.state.selection
           })
         });
         
         const { changes } = await response.json();
         onChangeSuggested?.(changes);
         return;
       }
       
       // Continue with existing flow...
     });
   };
   ```

### Phase 2: LangGraph Agent Enhancement

**Current Agent Structure** (from your Python agent):
```python
# agent/agent.py
class DocumentGeneratorAgent:
    def __init__(self):
        self.tools = [analyze_questionnaire, generate_content, save_to_supabase]
```

**Enhanced Agent Structure**:
```python
# agent/agent.py
class DocumentGeneratorAgent:
    def __init__(self):
        self.tools = [
            analyze_questionnaire, 
            generate_content, 
            save_to_supabase,
            # New tools for diff functionality
            suggest_targeted_edit,
            validate_edit_boundaries,
            save_change_to_supabase
        ]
    
    @tool
    def suggest_targeted_edit(
        self,
        content: str,
        instruction: str,
        boundaries: Dict[str, int],
        context: Dict[str, str]
    ) -> Dict[str, Any]:
        """Generate targeted edit suggestion"""
        # Use existing LLM but with constrained prompt
        prompt = f"""
        Edit ONLY this text: "{content}"
        Instruction: {instruction}
        Context before: {context['before'][:100]}
        Context after: {context['after'][:100]}
        
        Rules:
        1. Return ONLY the edited version of the provided text
        2. Do not add content outside the original scope
        3. Maintain the same format and style
        """
        
        response = self.llm.invoke(prompt)
        
        return {
            "original": content,
            "suggested": response.content,
            "reasoning": "Generated based on user instruction",
            "confidence": 0.85
        }
```

### Phase 3: Supabase Real-time Integration

**Leverage Existing Infrastructure**:
```typescript
// Extend your planned real-time setup
// src/hooks/useDocumentSubscription.js

export function useDocumentSubscription(documentId) {
  const [changes, setChanges] = useState([]);
  
  useEffect(() => {
    // Subscribe to both documents AND changes
    const channel = supabase.channel(`doc-${documentId}`)
      // Existing document subscription
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${documentId}`
      }, handleDocumentUpdate)
      // New changes subscription
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'document_changes',
        filter: `document_id=eq.${documentId}`
      }, handleChangeUpdate)
      .subscribe();
      
    return () => channel.unsubscribe();
  }, [documentId]);
  
  return { changes };
}
```

## Specific Integration Considerations

### 1. Working with Current Polling Architecture

Since you're currently using polling for LangGraph updates:

```typescript
// Adapt polling mechanism for diff updates
const pollForChanges = async (threadId, runId) => {
  let attempts = 0;
  const maxAttempts = 30;
  
  while (attempts < maxAttempts) {
    const response = await fetch('/api/langgraph/poll', {
      method: 'POST',
      body: JSON.stringify({ threadId, runId })
    });
    
    const data = await response.json();
    
    // Check for new diff-specific fields
    if (data.suggested_changes) {
      // Store changes in Supabase
      await supabase
        .from('document_changes')
        .insert(data.suggested_changes);
      
      // UI will update via subscription
      break;
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
};
```

### 2. Gradual Migration Path

**Step 1**: Add diff tables without modifying existing flow
```sql
-- Safe to add alongside existing tables
CREATE TABLE IF NOT EXISTS document_changes ...
CREATE TABLE IF NOT EXISTS change_batches ...
```

**Step 2**: Feature flag for diff mode
```typescript
// In your environment or user preferences
const FEATURES = {
  DIFF_MODE: process.env.REACT_APP_ENABLE_DIFF === 'true'
};

// In components
{FEATURES.DIFF_MODE && <DiffControls />}
```

**Step 3**: Parallel implementation
- Keep existing document generation working
- Add diff as optional enhancement
- Gradually migrate users

### 3. API Endpoint Adaptation

**Extend existing Vercel functions**:
```typescript
// api/langgraph/suggest-edit.js
import { Client } from '@langchain/langgraph-sdk';

export default async function handler(req, res) {
  // Reuse existing client setup
  const client = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL,
    apiKey: process.env.LANGGRAPH_API_KEY
  });
  
  const { documentId, instruction, selection } = req.body;
  
  // Fetch document content from Supabase
  const { data: document } = await supabase
    .from('documents')
    .select('content')
    .eq('id', documentId)
    .single();
  
  // Extract selection content
  const selectedContent = extractSelection(document.content, selection);
  
  // Create targeted edit task
  const thread = await client.threads.create();
  const run = await client.runs.create(thread.thread_id, 'document_generator', {
    input: {
      task_type: 'targeted_edit',  // New task type
      content: selectedContent,
      instruction: instruction,
      document_id: documentId,
      boundaries: selection
    }
  });
  
  // Return immediately, let polling handle results
  res.json({ threadId: thread.thread_id, runId: run.run_id });
}
```

## Migration Checklist

### Pre-Implementation
- [ ] Review current LangGraph agent code
- [ ] Backup existing database
- [ ] Create feature flag system
- [ ] Set up test environment

### Database Migration
- [ ] Create diff-related tables
- [ ] Add indexes for performance
- [ ] Test RLS policies
- [ ] Verify foreign key constraints

### Frontend Integration
- [ ] Install diff-match-patch library
- [ ] Create DiffVisualizerExtension for TipTap
- [ ] Extend useAIChat hook
- [ ] Add diff UI components

### LangGraph Enhancement
- [ ] Add targeted edit tools to agent
- [ ] Update agent prompts
- [ ] Test boundary validation
- [ ] Implement confidence scoring

### Testing & Rollout
- [ ] Unit tests for diff logic
- [ ] Integration tests with existing features
- [ ] Performance testing
- [ ] Gradual feature rollout

## Best Practices for Your Architecture

### 1. Maintain Existing Patterns
```typescript
// Follow your established patterns
// Example from your codebase:
const handleFileSelect = async (file) => {
  setIsProcessing(true);
  try {
    // Your existing pattern
    const htmlContent = await documentProcessor.processFile(file);
    // Add diff-specific logic
    if (diffMode) {
      await createSnapshot(htmlContent);
    }
  } finally {
    setIsProcessing(false);
  }
};
```

### 2. Reuse Existing Services
```typescript
// Extend documentProcessor.js
export const documentProcessor = {
  // Existing methods...
  processFile: async (file) => { /* ... */ },
  
  // New diff-specific methods
  extractSelection: (content, selection) => { /* ... */ },
  applyChange: (content, change) => { /* ... */ }
};
```

### 3. Consistent Error Handling
```typescript
// Match your existing error patterns
try {
  const changes = await suggestChanges(selection);
  notification.success('Changes suggested');
} catch (error) {
  console.error('[Diff Error]', error);
  notification.error('Failed to generate suggestions');
}
```

## Performance Considerations

### 1. Database Queries
```sql
-- Optimize for your document-centric queries
CREATE INDEX idx_changes_document_status 
ON document_changes(document_id, status) 
WHERE status = 'pending';
```

### 2. Real-time Updates
```typescript
// Batch updates to prevent UI thrashing
const batchedUpdates = useMemo(() => 
  debounce((changes) => {
    setPendingChanges(prev => [...prev, ...changes]);
  }, 100), 
[]); 
```

### 3. Memory Management
```typescript
// Clean up old changes
useEffect(() => {
  const cleanup = setInterval(() => {
    setPendingChanges(prev => 
      prev.filter(c => c.status === 'pending')
    );
  }, 60000); // Every minute
  
  return () => clearInterval(cleanup);
}, []);
```

## Troubleshooting Guide

### Common Integration Issues

1. **Position Mismatch**
   - Symptom: Changes applied to wrong location
   - Solution: Store TipTap transaction history
   - Fallback: Content-based matching

2. **LangGraph Timeout**
   - Symptom: No response after 60s
   - Solution: Implement chunking for large edits
   - Fallback: Process locally with smaller model

3. **Supabase Subscription Drops**
   - Symptom: Real-time updates stop
   - Solution: Implement reconnection logic
   - Fallback: Periodic polling

## Next Steps

1. **Prototype** (Week 1)
   - Set up diff tables
   - Basic UI for viewing changes
   - Simple accept/reject

2. **Integration** (Week 2-3)
   - Connect to LangGraph
   - Implement real-time updates
   - Add keyboard shortcuts

3. **Polish** (Week 4)
   - Performance optimization
   - Error handling
   - User testing

## Conclusion

The AI diff system can be seamlessly integrated into your existing architecture by:
1. Extending rather than replacing current components
2. Using feature flags for gradual rollout
3. Leveraging existing patterns and services
4. Maintaining backward compatibility

The key is to start small, test thoroughly, and iterate based on user feedback. 