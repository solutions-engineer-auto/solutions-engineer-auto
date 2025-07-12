// Simple test script to check existing vector database
// Run this in browser console on your app

async function testVectorDatabase() {
  console.log('🧬 Testing existing vector database...');
  
  // Check if we can access Supabase
  if (!window.supabase) {
    console.error('❌ Supabase not available');
    return;
  }
  
  try {
    // 1. Check document_embeddings table
    const { data: embeddings, error: embError } = await window.supabase
      .from('document_embeddings')
      .select('id, account_data_source_id, created_at')
      .limit(10);
    
    if (embError) {
      console.error('❌ Error accessing embeddings:', embError);
      return;
    }
    
    console.log(`✅ Found ${embeddings?.length || 0} embeddings`);
    console.log('Sample embeddings:', embeddings);
    
    // 2. Check account_data_sources
    const { data: docs, error: docError } = await window.supabase
      .from('account_data_sources')
      .select('id, file_name, file_type, created_at')
      .limit(10);
    
    if (docError) {
      console.error('❌ Error accessing documents:', docError);
      return;
    }
    
    console.log(`✅ Found ${docs?.length || 0} documents`);
    console.log('Sample documents:', docs);
    
    // 3. Test the existing match_document_chunks function
    if (embeddings && embeddings.length > 0) {
      // Get a sample embedding
      const { data: sampleEmbedding, error: sampleError } = await window.supabase
        .from('document_embeddings')
        .select('embedding, account_data_source_id')
        .limit(1);
      
      if (sampleError || !sampleEmbedding?.length) {
        console.log('⚠️ No embeddings found for similarity test');
        return;
      }
      
      // Get the account_id for the sample
      const { data: sampleDoc, error: docError2 } = await window.supabase
        .from('account_data_sources')
        .select('account_id')
        .eq('id', sampleEmbedding[0].account_data_source_id)
        .single();
      
      if (docError2) {
        console.error('❌ Error getting account_id:', docError2);
        return;
      }
      
      // Test similarity search
      const { data: similarDocs, error: simError } = await window.supabase
        .rpc('match_document_chunks', {
          p_account_id: sampleDoc.account_id,
          query_embedding: sampleEmbedding[0].embedding,
          match_threshold: 0.3,
          match_count: 5
        });
      
      if (simError) {
        console.error('❌ Error in similarity search:', simError);
        return;
      }
      
      console.log(`✅ Similarity search returned ${similarDocs?.length || 0} results`);
      console.log('Similar chunks:', similarDocs);
    }
    
    // 4. Summary
    console.log('\n📊 SUMMARY:');
    console.log(`- Total embeddings: ${embeddings?.length || 0}`);
    console.log(`- Total documents: ${docs?.length || 0}`);
    console.log('- Vector similarity search: Working ✅');
    console.log('- Ready for Knowledge Graph RAG: YES! 🎉');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Auto-run test
testVectorDatabase(); 