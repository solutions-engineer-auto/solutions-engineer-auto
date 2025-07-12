# Embedding Debug Analysis

## Critical Issues Found

### 1. Document Mismatch
Your debug shows a 406 error when trying to fetch document `f1b8a295-b2a7-4c0a-9375-74f5570a0913`:
- This document has embeddings in `document_embeddings` table
- But doesn't exist in `account_data_sources` table
- This creates orphaned embeddings

**Cause**: Documents were deleted from `account_data_sources` but their embeddings remain.

### 2. Zero Similarity Scores
All similarity calculations return exactly 0.0000, which indicates:
- Embeddings might be stored as strings instead of arrays
- Embeddings might be all zeros (not properly generated)
- Embeddings might be in an unexpected format

### 3. NaN Statistics
The similarity statistics show NaN (Not a Number) for Min/Avg/Max, confirming calculation issues.

## Fixes Applied

### 1. String Embedding Handling
Updated `vectorRAGService.js` to:
```javascript
// Parse string embeddings if needed
if (typeof embedding === 'string') {
  embedding = JSON.parse(embedding);
}
```

### 2. Enhanced Error Handling
- Added validation for proper array format
- Added warnings for non-numeric values
- Added zero magnitude detection

### 3. Fallback Query
Added a fallback query to detect orphaned embeddings when the join fails.

## How to Debug

1. **Check Embedding Format** (run in console):
   ```javascript
   await testEmbeddingFormat()
   ```
   This will show:
   - If embeddings are strings or arrays
   - If they contain actual values or all zeros
   - The magnitude of vectors (should be ~1)

2. **Clean Orphaned Embeddings**:
   ```sql
   -- Find orphaned embeddings
   SELECT de.account_data_source_id 
   FROM document_embeddings de
   LEFT JOIN account_data_sources ads ON de.account_data_source_id = ads.id
   WHERE ads.id IS NULL;
   
   -- Delete orphaned embeddings
   DELETE FROM document_embeddings
   WHERE account_data_source_id NOT IN (
     SELECT id FROM account_data_sources
   );
   ```

3. **Verify Embedding Generation**:
   - Check if your edge function is running
   - Verify OpenAI API key is set
   - Check edge function logs for errors

## Root Cause Analysis

The most likely causes:

1. **Embeddings Not Generated**: The edge function might not be running, resulting in null/zero embeddings
2. **Data Type Mismatch**: Embeddings stored as strings but expected as arrays
3. **Deleted Documents**: Documents removed but embeddings remain, causing join failures

## Next Steps

1. Run `await testEmbeddingFormat()` to see actual embedding format
2. Clean up orphaned embeddings
3. Verify edge function is generating proper embeddings
4. Re-upload a test document and check if new embeddings work 