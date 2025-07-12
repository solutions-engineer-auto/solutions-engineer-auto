// Test if embeddings are in pgvector format
// pgvector stores as strings like "[0.1,0.2,0.3]"

window.testPgvectorFormat = async function() {
  const { supabase } = await import('/src/supabaseClient.js');
  
  console.log('🔍 Testing pgvector format...\n');
  
  // Get a raw SQL result to see the actual format
  const { error } = await supabase.rpc('get_embedding_format', {}, {
    // This is a hack to run raw SQL
    get: true,
    body: null
  }).select(`
    SELECT 
      embedding::text as embedding_text,
      pg_typeof(embedding) as embedding_type
    FROM document_embeddings
    LIMIT 1
  `).single();
  
  if (error) {
    // Try a simpler approach
    console.log('Direct RPC failed, trying regular query...');
    
    const { data: emb, error: embError } = await supabase
      .from('document_embeddings')
      .select('embedding')
      .limit(1)
      .single();
      
    if (!embError && emb) {
      console.log('Raw embedding value:', emb.embedding);
      console.log('Type:', typeof emb.embedding);
      
      if (typeof emb.embedding === 'string') {
        console.log('\n✅ Embeddings are stored as strings (pgvector format)');
        console.log('This is normal for pgvector columns');
        
        // Test parsing
        try {
          // pgvector format: "[0.1,0.2,0.3]"
          let parsed;
          if (emb.embedding.startsWith('[')) {
            parsed = JSON.parse(emb.embedding);
          } else if (emb.embedding.startsWith('{')) {
            // Some versions use {} instead of []
            parsed = JSON.parse(emb.embedding.replace('{', '[').replace('}', ']'));
          }
          
          console.log('\nParsed successfully!');
          console.log('Array length:', parsed.length);
          console.log('First 5 values:', parsed.slice(0, 5));
          console.log('All numbers?:', parsed.slice(0, 5).every(v => typeof v === 'number'));
          
        } catch (e) {
          console.error('Failed to parse:', e);
          console.log('Embedding might be in a different format');
        }
      } else if (Array.isArray(emb.embedding)) {
        console.log('\n✅ Embeddings are already arrays');
        console.log('No parsing needed');
      } else {
        console.log('\n❌ Unknown embedding format');
      }
    }
  }
  
  console.log('\n💡 Fix: The vectorRAGService has been updated to handle string embeddings automatically');
};

console.log('✅ Test loaded. Run: await testPgvectorFormat()'); 