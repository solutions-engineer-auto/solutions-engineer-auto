# Knowledge Graph Fixes Applied

## Issues Identified and Fixed

### 1. RPC Function Type Mismatch (Error 42804)
**Problem**: The `generate_document_relationships_from_embeddings` function expected `TEXT` type for file names, but the database column is `VARCHAR`.

**Fix Applied**: Created migration `20250115_fix_rpc_type_mismatch.sql` that changes the function return types from `TEXT` to `VARCHAR`.

**To Apply**:
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/20250115_fix_rpc_type_mismatch.sql
```

### 2. Purple Nodes (Missing Visual Properties)
**Problem**: When using RAG mode, nodes were missing metadata and visual properties, causing them to appear purple instead of showing proper file type colors.

**Fix Applied**: Updated `KnowledgeGraph.jsx` to include complete metadata structure when creating nodes in RAG mode, ensuring proper color mapping based on file types:
- PDFs: Red 📄
- Word Docs: Blue 📝
- Excel: Green 📊
- Text: Green 📃
- etc.

## How to Verify the Fix

1. **Apply the SQL Migration**:
   ```sql
   -- In Supabase Dashboard SQL Editor
   -- Copy and paste contents of: supabase/migrations/20250115_fix_rpc_type_mismatch.sql
   ```

2. **Test the Fix**:
   ```javascript
   // In browser console
   await testKnowledgeGraphFix()
   ```

3. **Expected Results**:
   - ✅ No more RPC type mismatch errors
   - ✅ Nodes show proper colors based on file type
   - ✅ Relationships appear if documents have embeddings
   - ✅ Can toggle between Mock and RAG modes

## Understanding the Modes

### Mock Mode
- Shows random but visually appealing relationships
- Always works, even without embeddings
- Good for demos or testing

### RAG Mode
- Shows real semantic relationships based on document content
- Requires documents to have embeddings
- Falls back gracefully if no embeddings exist

## Troubleshooting

### Still No Relationships?
1. Check if documents have embeddings: `SELECT COUNT(*) FROM document_embeddings;`
2. Lower the similarity threshold (default is 0.7)
3. Upload more related documents

### Still Getting Errors?
1. Make sure the RPC function migration was applied
2. Refresh the page after applying SQL changes
3. Check browser console for specific error messages

## Next Steps

1. **With Embeddings**: Toggle to RAG mode to see real relationships
2. **Without Embeddings**: Upload documents and wait for edge function to process
3. **Explore**: Drag nodes to organize, positions are saved automatically 