// Debug script for RAG relationships
// Run this to understand why relationships aren't being found

window.debugRAG = async function() {
  const { supabase } = await import('/src/supabaseClient.js');
  const { vectorRAGService } = await import('/src/services/knowledgeGraph/vectorRAGService.js');
  
  console.log('🔍 RAG Debug Analysis\n');
  
  // 1. Check the join query that's failing
  console.log('1️⃣ Testing the join query...');
  const { data: joinTest, error: joinError } = await supabase
    .from('document_embeddings')
    .select(`
      account_data_source_id,
      embedding,
      account_data_sources!inner(
        id,
        file_name,
        account_id
      )
    `)
    .limit(5);
    
  if (joinError) {
    console.error('❌ Join query failed:', joinError);
  } else {
    console.log(`✅ Join query returned ${joinTest?.length || 0} results`);
    if (joinTest && joinTest.length > 0) {
      console.log('Sample result:', joinTest[0]);
    }
  }
  
  // 2. Check if the problem is the join - try without it
  console.log('\n2️⃣ Checking embeddings without join...');
  const { data: embeddings, error: embError } = await supabase
    .from('document_embeddings')
    .select('account_data_source_id, embedding')
    .limit(10);
    
  if (!embError && embeddings) {
    console.log(`Found ${embeddings.length} embeddings`);
    const uniqueDocs = new Set(embeddings.map(e => e.account_data_source_id));
    console.log(`Unique documents with embeddings: ${uniqueDocs.size}`);
    console.log('Document IDs:', Array.from(uniqueDocs).slice(0, 5));
  }
  
  // 3. Check if those document IDs exist in account_data_sources
  console.log('\n3️⃣ Verifying document existence...');
  if (embeddings && embeddings.length > 0) {
    const docId = embeddings[0].account_data_source_id;
    const { data: doc, error: docError } = await supabase
      .from('account_data_sources')
      .select('id, file_name')
      .eq('id', docId)
      .single();
      
    if (docError) {
      console.error(`❌ Document ${docId} not found:`, docError);
    } else {
      console.log(`✅ Document exists:`, doc);
    }
  }
  
  // 4. Test similarity calculation
  console.log('\n4️⃣ Testing similarity calculation...');
  if (embeddings && embeddings.length >= 2) {
    const vec1 = embeddings[0].embedding;
    const vec2 = embeddings[1].embedding;
    
    if (vec1 && vec2) {
      const similarity = vectorRAGService.cosineSimilarity(vec1, vec2);
      console.log(`Similarity between first two embeddings: ${similarity.toFixed(4)}`);
      console.log(`Threshold is: ${vectorRAGService.similarityThreshold}`);
      console.log(`Would create relationship: ${similarity > vectorRAGService.similarityThreshold ? 'YES' : 'NO'}`);
    }
  }
  
  // 5. Try with lower threshold
  console.log('\n5️⃣ Testing with lower threshold...');
  const originalThreshold = vectorRAGService.similarityThreshold;
  vectorRAGService.similarityThreshold = 0.3; // Much lower
  
  const relationships = await vectorRAGService.generateDocumentRelationships();
  console.log(`Found ${relationships.length} relationships with threshold 0.3`);
  
  if (relationships.length > 0) {
    console.log('Sample relationships:');
    relationships.slice(0, 3).forEach(rel => {
      console.log(`  ${rel.source_file_name} <-> ${rel.target_file_name}: ${rel.similarity.toFixed(4)}`);
    });
  }
  
  // Restore original threshold
  vectorRAGService.similarityThreshold = originalThreshold;
  
  // 6. Check similarity distribution
  console.log('\n6️⃣ Checking similarity distribution...');
  if (embeddings && embeddings.length >= 2) {
    const similarities = [];
    for (let i = 0; i < Math.min(5, embeddings.length); i++) {
      for (let j = i + 1; j < Math.min(5, embeddings.length); j++) {
        if (embeddings[i].embedding && embeddings[j].embedding) {
          const sim = vectorRAGService.cosineSimilarity(embeddings[i].embedding, embeddings[j].embedding);
          similarities.push(sim);
        }
      }
    }
    
    if (similarities.length > 0) {
      console.log('Similarity scores:', similarities.map(s => s.toFixed(4)));
      console.log(`Average: ${(similarities.reduce((a, b) => a + b, 0) / similarities.length).toFixed(4)}`);
      console.log(`Max: ${Math.max(...similarities).toFixed(4)}`);
      console.log(`Min: ${Math.min(...similarities).toFixed(4)}`);
    }
  }
};

console.log('✅ Debug script loaded. Run: await debugRAG()'); 