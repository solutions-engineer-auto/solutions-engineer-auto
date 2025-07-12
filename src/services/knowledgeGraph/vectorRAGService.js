// Vector RAG Service - Leverages existing vector database for Knowledge Graph
// Uses the existing document_embeddings table and match_document_chunks function

import { supabase } from '../../supabaseClient';

export class VectorRAGService {
  constructor() {
    this.similarityThreshold = 0.5; // Lowered from 0.7 - adjust based on your needs
    this.maxRelationships = 50;
  }

  /**
   * Generate relationships using existing vector embeddings
   * This uses your existing document_embeddings table and similarity functions
   */
  async generateDocumentRelationships(accountId = null) {
    try {
      console.log('🔍 Generating relationships using existing vector embeddings...');
      
      // FRONTEND FIX: Instead of using the problematic RPC function,
      // let's query the data directly and compute relationships here
      
      // Step 1: Get documents with embeddings
      let documentsQuery = supabase
        .from('document_embeddings')
        .select(`
          account_data_source_id,
          embedding,
          account_data_sources!inner(
            id,
            file_name,
            account_id
          )
        `);
      
      if (accountId) {
        documentsQuery = documentsQuery.eq('account_data_sources.account_id', accountId);
      }
      
      const { data: embeddingData, error: embError } = await documentsQuery;
      
      if (embError) {
        console.error('Error fetching embeddings:', embError);
        return this.generateMockRelationships();
      }
      
      if (!embeddingData || embeddingData.length === 0) {
        console.warn('No documents with embeddings found');
        
        // Try a simpler query without the join
        console.log('🔄 Trying fallback query without join...');
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('document_embeddings')
          .select('account_data_source_id, embedding');
          
        if (!fallbackError && fallbackData && fallbackData.length > 0) {
          console.log(`Found ${fallbackData.length} embeddings without join`);
          console.warn('⚠️ Embeddings exist but documents are missing from account_data_sources');
          console.warn('This means documents were deleted but embeddings remain');
        }
        
        return this.generateMockRelationships();
      }
      
      // Step 2: Group embeddings by document (documents can have multiple chunks)
      const documentMap = new Map();
      embeddingData.forEach(item => {
        const docId = item.account_data_source_id;
        if (!documentMap.has(docId)) {
          documentMap.set(docId, {
            id: docId,
            file_name: item.account_data_sources.file_name,
            embeddings: []
          });
        }
        if (item.embedding) {
          // Handle embeddings that might be strings
          let embedding = item.embedding;
          if (typeof embedding === 'string') {
            try {
              // pgvector can store as "[...]" or "{...}"
              if (embedding.startsWith('{') && embedding.endsWith('}')) {
                // Convert PostgreSQL array format {} to JSON array format []
                embedding = embedding.replace('{', '[').replace('}', ']');
              }
              embedding = JSON.parse(embedding);
              console.log('📝 Parsed string embedding');
            } catch (e) {
              console.error('Failed to parse embedding:', e);
              return;
            }
          }
          
          // Validate it's a proper array of numbers
          if (Array.isArray(embedding) && embedding.length > 0 && typeof embedding[0] === 'number') {
            documentMap.get(docId).embeddings.push(embedding);
          } else {
            console.warn(`Invalid embedding format for document ${docId}:`, typeof embedding);
          }
        }
      });
      
      const documents = Array.from(documentMap.values()).filter(doc => doc.embeddings.length > 0);
      
      console.log(`📊 Debug: Found ${documents.length} unique documents with embeddings`);
      console.log('Document names:', documents.map(d => d.file_name).slice(0, 5));
      
      if (documents.length < 2) {
        console.warn('Not enough documents with embeddings to create relationships');
        return [];
      }
      
      // Step 3: Calculate similarities on the frontend
      // This avoids the RPC type mismatch entirely
      const relationships = [];
      const allSimilarities = []; // Track all similarities for debugging
      
      for (let i = 0; i < documents.length; i++) {
        for (let j = i + 1; j < documents.length; j++) {
          const doc1 = documents[i];
          const doc2 = documents[j];
          
          // Use first embedding as representative (you could average them)
          const similarity = this.cosineSimilarity(doc1.embeddings[0], doc2.embeddings[0]);
          allSimilarities.push(similarity);
          
          if (similarity > this.similarityThreshold) {
            relationships.push({
              source_id: doc1.id,
              target_id: doc2.id,
              similarity: similarity,
              source_file_name: doc1.file_name,
              target_file_name: doc2.file_name
            });
          }
        }
      }
      
      // Debug: Show similarity distribution
      if (allSimilarities.length > 0) {
        const avgSim = allSimilarities.reduce((a, b) => a + b, 0) / allSimilarities.length;
        const maxSim = Math.max(...allSimilarities);
        const minSim = Math.min(...allSimilarities);
        console.log(`📈 Similarity stats: Min=${minSim.toFixed(3)}, Avg=${avgSim.toFixed(3)}, Max=${maxSim.toFixed(3)}`);
        console.log(`🎯 Threshold=${this.similarityThreshold}, Above threshold: ${relationships.length}/${allSimilarities.length}`);
      }
      
      // Sort by similarity and limit
      relationships.sort((a, b) => b.similarity - a.similarity);
      const limitedRelationships = relationships.slice(0, this.maxRelationships);
      
      console.log(`✅ Found ${limitedRelationships.length} relationships (frontend calculation)`);
      return limitedRelationships;
      
    } catch (error) {
      console.error('Error in generateDocumentRelationships:', error);
      return this.generateMockRelationships();
    }
  }
  
  // Helper function to calculate cosine similarity between two vectors
  cosineSimilarity(vec1, vec2) {
    if (!vec1 || !vec2) {
      console.warn('Null vectors passed to cosineSimilarity');
      return 0;
    }
    
    if (vec1.length !== vec2.length) {
      console.warn(`Vector length mismatch: ${vec1.length} vs ${vec2.length}`);
      return 0;
    }
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      const v1 = vec1[i];
      const v2 = vec2[i];
      
      // Skip if either value is not a number
      if (typeof v1 !== 'number' || typeof v2 !== 'number' || isNaN(v1) || isNaN(v2)) {
        console.warn(`Non-numeric value at position ${i}: v1=${v1}, v2=${v2}`);
        continue;
      }
      
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }
    
    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);
    
    if (norm1 === 0 || norm2 === 0) {
      console.warn('Zero magnitude vector detected');
      return 0;
    }
    
    const similarity = dotProduct / (norm1 * norm2);
    
    // Clamp to valid range [0, 1]
    return Math.max(0, Math.min(1, similarity));
  }
  
  // Generate some mock relationships as fallback
  generateMockRelationships() {
    console.log('📊 Generating mock relationships for demo purposes');
    
    // Return empty array - the Knowledge Graph will fall back to mock data
    return [];
  }

  /**
   * Find similar documents for a specific document
   * Uses existing match_document_chunks function
   */
  async findSimilarDocuments(documentId, accountId) {
    try {
      // First get a chunk from the target document to use as query
      const { data: chunks, error: chunkError } = await supabase
        .from('document_embeddings')
        .select('embedding')
        .eq('account_data_source_id', documentId)
        .limit(1);

      if (chunkError || !chunks || chunks.length === 0) {
        console.warn('No embeddings found for document:', documentId);
        return [];
      }

      // Use the existing match_document_chunks function
      const { data: similarChunks, error: matchError } = await supabase
        .rpc('match_document_chunks', {
          p_account_id: accountId,
          query_embedding: chunks[0].embedding,
          match_threshold: this.similarityThreshold,
          match_count: 10
        });

      if (matchError) {
        console.error('Error finding similar documents:', matchError);
        return [];
      }

      return similarChunks || [];
      
    } catch (error) {
      console.error('Error in findSimilarDocuments:', error);
      return [];
    }
  }

  /**
   * Get embedding statistics for your existing data
   */
  async getEmbeddingStats(accountId = null) {
    try {
      let query = supabase
        .from('document_embeddings')
        .select('id, account_data_source_id, created_at', { count: 'exact' });

      if (accountId) {
        query = query.eq('account_data_sources.account_id', accountId);
      }

      const { data, error, count } = await query;

      if (error) {
        console.error('Error getting embedding stats:', error);
        return { totalEmbeddings: 0, documentsWithEmbeddings: 0 };
      }

      // Get unique document count
      const uniqueDocuments = new Set(data?.map(d => d.account_data_source_id) || []);

      return {
        totalEmbeddings: count || 0,
        documentsWithEmbeddings: uniqueDocuments.size,
        oldestEmbedding: data?.[0]?.created_at,
        newestEmbedding: data?.[data.length - 1]?.created_at
      };
      
    } catch (error) {
      console.error('Error in getEmbeddingStats:', error);
      return { totalEmbeddings: 0, documentsWithEmbeddings: 0 };
    }
  }

  /**
   * Test the vector search functionality
   */
  async testVectorSearch(accountId, query = "security requirements") {
    try {
      console.log('🧪 Testing vector search with query:', query);
      
      // This would normally generate an embedding for the query
      // For now, let's get a sample embedding from existing data
      const { data: sampleEmbedding, error } = await supabase
        .from('document_embeddings')
        .select('embedding')
        .limit(1);

      if (error || !sampleEmbedding || sampleEmbedding.length === 0) {
        return { success: false, error: 'No embeddings found to test with' };
      }

      // Test the match_document_chunks function
      const { data: results, error: matchError } = await supabase
        .rpc('match_document_chunks', {
          p_account_id: accountId,
          query_embedding: sampleEmbedding[0].embedding,
          match_threshold: 0.5,
          match_count: 5
        });

      if (matchError) {
        return { success: false, error: matchError.message };
      }

      return {
        success: true,
        results: results || [],
        message: `Found ${results?.length || 0} similar chunks`
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

// Create and export singleton instance
export const vectorRAGService = new VectorRAGService(); 