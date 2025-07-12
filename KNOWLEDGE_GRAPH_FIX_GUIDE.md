# Knowledge Graph Fix Guide

## Current State Analysis

Your SE Auto MVP Frontend has a Knowledge Graph implementation that's experiencing several issues:

### 1. Database Architecture Confusion
- **You ALREADY have a comprehensive vector database** with:
  - `document_embeddings` table storing OpenAI embeddings
  - Edge functions that auto-generate embeddings on document upload
  - `match_document_chunks` function for RAG
  - This is a production-ready vector search infrastructure!

### 2. Migration Conflicts
- Two migrations trying to add similar columns:
  - `20250111_add_is_global_to_data_sources.sql` - Adds is_global, graph_position, AND embedding column
  - `20250115_minimal_knowledge_graph_support.sql` - Adds ONLY is_global and graph_position
- **The minimal migration is correct** because embeddings are already stored in `document_embeddings` table

### 3. Code Issues
- Knowledge Graph defaults to mock data (useRAG is false)
- Test script checking for wrong columns
- MSW trying to access wrong port (5173 vs 5179)

## Step-by-Step Fix

### Step 1: Apply the Correct Migration

Apply ONLY the minimal migration (if not already applied):

```sql
-- In Supabase Dashboard SQL Editor
-- Run: supabase/migrations/20250115_minimal_knowledge_graph_support.sql
```

**DO NOT** apply `20250111_add_is_global_to_data_sources.sql` as it duplicates your existing embedding infrastructure.

### Step 2: Enable RAG Mode in Knowledge Graph

The Knowledge Graph has a toggle for RAG mode that's currently disabled. To enable it by default:

```javascript
// In src/components/KnowledgeGraph/KnowledgeGraph.jsx
// Line 51, change:
const [useRAG, setUseRAG] = useState(false);
// To:
const [useRAG, setUseRAG] = useState(true);
```

### Step 3: Create Missing RPC Function

Your vector database needs this function to generate relationships. Run in Supabase SQL Editor:

```sql
-- This function already exists in: supabase/migrations/20250115_add_vector_relationship_functions.sql
-- Apply it if not already done
```

### Step 4: Fix MSW Port Issues (Optional)

The Mock Service Worker errors are harmless but annoying. To fix:

```javascript
// In vite.config.js, update proxy targets from 5173 to dynamic:
// This is optional - the errors don't affect functionality
```

### Step 5: Test the Fix

1. Open browser console
2. Navigate to your app
3. Run: `await testKnowledgeGraphAfterMigration()`
4. You should see all tests passing

## How It Works

### Your Current Architecture

```
Document Upload
    ↓
Edge Function (auto-generates embeddings)
    ↓
document_embeddings table (stores vectors)
    ↓
Knowledge Graph (visualizes relationships)
    ├── Mock Mode: Random relationships (current default)
    └── RAG Mode: Real semantic relationships (what you want)
```

### Switching Between Modes

The Knowledge Graph has a toggle in the UI:
- **Mock Mode**: Fast, random relationships for testing
- **RAG Mode**: Real relationships based on document similarity

### Expected Behavior After Fix

1. **With Embeddings**: If your documents have embeddings, the graph will show real semantic relationships
2. **Without Embeddings**: Falls back to mock relationships
3. **Mixed Mode**: Can use mock data while embeddings are being generated

## Verification Checklist

- [ ] Migration applied (check for is_global and graph_position columns)
- [ ] No errors about missing columns
- [ ] Knowledge Graph loads without errors
- [ ] Can toggle between Mock/RAG mode in UI
- [ ] Document relationships appear (mock or real)

## Common Issues

### "No relationships found"
- Check if documents have embeddings: `SELECT COUNT(*) FROM document_embeddings;`
- New documents need time for edge function to generate embeddings
- Similarity threshold might be too high (default 0.7)

### "RPC function does not exist"
- Apply the vector relationship functions migration
- Check function exists: `SELECT proname FROM pg_proc WHERE proname LIKE '%relationship%';`

### Graph shows mock data even in RAG mode
- No documents have embeddings yet
- Fallback to mock is working as designed
- Upload documents and wait for edge function to process

## Next Steps

1. **Upload Documents**: The edge function will automatically generate embeddings
2. **Mark as Global**: Use the UI toggle to mark documents as company-wide knowledge
3. **Explore Relationships**: Switch to RAG mode to see real semantic connections
4. **Save Positions**: Drag nodes to organize - positions are saved in graph_position column

## Success Indicators

- ✅ No console errors about missing columns
- ✅ Knowledge Graph loads and displays nodes
- ✅ Can switch between Account/Global/Both views
- ✅ RAG mode shows real relationships (if embeddings exist)
- ✅ Mock mode provides immediate visualization while embeddings generate 