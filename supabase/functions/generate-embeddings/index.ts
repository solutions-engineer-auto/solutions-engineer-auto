/**
 * This Supabase Edge Function generates embeddings for document content.
 * It is triggered by a database webhook when a new row is inserted into the `account_data_sources` table.
 * The function chunks the document content, generates embeddings using OpenAI,
 * and stores them in the `document_embeddings` table.
 */

/// <reference types="https://esm.sh/v135/@supabase/functions-js@2.4.1/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OpenAI } from 'https://esm.sh/openai@4.10.0'

/**
 * Splits a string of text into smaller chunks.
 * @param {string} text The text to be chunked.
 * @param {number} [chunkSize=1000] The approximate size of each chunk.
 * @param {number} [overlap=200] The number of characters to overlap between chunks.
 * @returns {string[]} An array of text chunks.
 */
function chunkContent(text: string, chunkSize = 1000, overlap = 200): string[] {
  const chunks: string[] = [];
  if (!text) {
    return chunks;
  }

  let i = 0;
  while (i < text.length) {
    const end = i + chunkSize;
    chunks.push(text.substring(i, end));
    // If we are at the end, we don't need to overlap
    if (end >= text.length) {
      break;
    }
    i += chunkSize - overlap;
  }
  return chunks;
}


serve(async (req: Request) => {
  try {
    // 1. Receive Payload
    const { record: dataSource } = await req.json()

    // Validate payload
    if (!dataSource || !dataSource.content) {
      return new Response(JSON.stringify({ error: 'Missing data source or content' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { id: account_data_source_id, content } = dataSource

    // 2. Chunk Content
    const chunks = chunkContent(content);
    if (chunks.length === 0) {
      return new Response(JSON.stringify({ message: 'No content to process' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 3. Generate Embeddings
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY'),
    });
    
    const embeddingResponses = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunks,
    });

    const embeddings = embeddingResponses.data.map((embedding_data: any, i: number) => ({
      account_data_source_id,
      content: chunks[i],
      embedding: embedding_data.embedding,
    }));

    // 4. Store Embeddings
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error } = await supabaseClient.from('document_embeddings').insert(embeddings)

    if (error) {
      console.error('Error inserting embeddings:', error);
      throw error;
    }

    return new Response(JSON.stringify({ success: true, message: `Inserted ${embeddings.length} embeddings.` }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err) {
    console.error('Error in generate-embeddings function:', err);
    return new Response(String(err?.message ?? err), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}) 