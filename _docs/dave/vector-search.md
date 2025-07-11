
# Implementation Plan: Vector Search for Document Generation

This document outlines the plan to implement a vector search capability to improve the context-awareness of the AI agent when generating documents.

## 1. Overview

The goal is to enhance the document generation process by using vector embeddings to find the most relevant information from uploaded context files. When a user uploads a document, we will generate embeddings for its content and store them. When the AI agent is asked to generate a document, it will use vector similarity search to find the most relevant context from these uploaded files to use in its response.

## 2. Database Modifications (Supabase)

The database needs to be prepared to store and search vector embeddings.

### 2.1. Enable `pgvector` Extension

The first step is to enable the `pgvector` extension in the Supabase project. This provides the necessary functions and data types for handling vector embeddings.

**Action:**
*   Create a new migration file to enable the extension:
    ```sql
    CREATE EXTENSION IF NOT EXISTS vector;
    ```

### 2.2. Create `document_embeddings` Table

A new table is required to store the text chunks and their corresponding vector embeddings from the uploaded documents.

**Action:**
*   Create a new migration file to define the `document_embeddings` table:
    ```sql
    CREATE TABLE document_embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_data_source_id UUID NOT NULL REFERENCES account_data_sources(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding VECTOR(1536), -- Assuming OpenAI's text-embedding-3-small, adjust size if needed
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    ```

### 2.3. Create Index on Embeddings

To make vector similarity searches efficient, we need to create an index on the `embedding` column.

**Action:**
*   Add the index creation to the migration file for `document_embeddings`:
    ```sql
    CREATE INDEX ON document_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
    -- The choice of index (ivfflat, hnsw) and its parameters might need tuning based on the data size and performance requirements.
    ```

## 3. Backend: Embedding Generation

When a file is uploaded and its content is stored in `account_data_sources`, we need a process to generate embeddings. A Supabase Edge Function is a good candidate for this task.

### 3.1. Create a Supabase Edge Function (`generate-embeddings`)

This function will be triggered whenever a new row is inserted into the `account_data_sources` table.

**Function Logic:**
1.  **Receive Payload**: The function will receive the new `account_data_sources` record.
2.  **Chunk Content**: The `content` of the file will be split into smaller, overlapping chunks. This is crucial for effective similarity search. A chunk size of ~500-1000 characters with some overlap is a good starting point.
3.  **Generate Embeddings**: For each text chunk, call an embedding model API (e.g., OpenAI, Cohere, or a self-hosted model) to generate a vector embedding. The `OPENAI_API_KEY` will need to be configured as a secret in Supabase.
4.  **Store Embeddings**: For each chunk and its vector, insert a new row into the `document_embeddings` table.

### 3.2. Set up Database Webhook

A database webhook will trigger the `generate-embeddings` Edge Function upon insertion into `account_data_sources`.

**Action:**
*   In the Supabase dashboard, create a new Database Webhook that listens for `INSERT` events on the `public.account_data_sources` table and invokes the `generate-embeddings` function.

## 4. Agent Modification: Enhanced Retrieval

The `Retrieval` node in the LangGraph agent needs to be updated to use the new vector search capability.

### 4.1. Update `retrieval.py`

The logic in `agent/nodes/retrieval.py` will be modified as follows:

**Current Logic:** Gathers information from `account_data_sources` directly.

**New Logic:**
1.  **Receive Query**: The node will receive the user's prompt or the generation task from the `Planning` node.
2.  **Generate Query Embedding**: Use the same embedding model as in the backend to generate a vector embedding for the incoming query.
3.  **Perform Similarity Search**:
    *   Create a Supabase RPC function (`match_document_chunks`) that takes a query embedding and a match threshold as input.
    *   This function will perform a similarity search (e.g., cosine similarity) on the `document_embeddings` table to find the top N most relevant text chunks.
    *   Example SQL for the RPC function:
        ```sql
        SELECT content
        FROM document_embeddings
        WHERE account_data_source_id IN (/* List of data sources for the current account */)
        ORDER BY embedding <=> query_embedding
        LIMIT 10;
        ```
4.  **Construct Context**: The `retrieval.py` script will call this RPC function. The retrieved text chunks will be concatenated into a single context string.
5.  **Output Context**: This context string will be passed to the `Generation` node.

## 5. Frontend Considerations

No direct frontend changes are required for this implementation, as the core logic is handled by the backend and the agent. The existing `FileUploadDropzone.jsx` will trigger the new embedding generation process via the database webhook.

## 6. Phased Rollout Plan

1.  **Phase 1: Database and Backend Setup**:
    *   ✅ Create migration to enable `pgvector` extension.
    *   ✅ Create migration for `document_embeddings` table with index.
    *   ✅ Develop the `generate-embeddings` Supabase Edge Function.
    *   ✅ Deploy the `generate-embeddings` function.
    *   ✅ Set up Database Webhook to trigger the function.
    *   ✅ Manually test by inserting a record into `account_data_sources` and verifying that embeddings are created correctly.

2.  **Phase 2: Agent Integration**:
    *   ✅ Create the `match_document_chunks` RPC function in Supabase.
    *   ✅ Update the `retrieval.py` node in the agent to use the new vector search logic.
    *   Test the agent end-to-end to ensure it retrieves relevant context and generates better documents.

3.  **Phase 3: Monitoring and Optimization**:
    *   Monitor the performance of the embedding generation and search.
    *   Tune the vector index and chunking strategy as needed based on real-world usage. 