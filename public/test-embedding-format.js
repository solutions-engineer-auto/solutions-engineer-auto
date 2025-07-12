// Deep dive into embedding format issues
// Run this to see what's actually in your embeddings

window.testEmbeddingFormat = async function() {
  const { supabase } = await import('/src/supabaseClient.js');
  
  console.log('🔍 Embedding Format Analysis\n');
  
  // 1. Get a few embeddings to inspect
  console.log('1️⃣ Fetching sample embeddings...');
  const { data: embeddings, error } = await supabase
    .from('document_embeddings')
    .select('id, account_data_source_id, embedding')
    .limit(3);
    
  if (error) {
    console.error('❌ Error fetching embeddings:', error);
    return;
  }
  
  if (!embeddings || embeddings.length === 0) {
    console.log('❌ No embeddings found');
    return;
  }
  
  // 2. Inspect the structure
  console.log('\n2️⃣ Embedding structure analysis:');
  embeddings.forEach((emb, idx) => {
    console.log(`\nEmbedding ${idx + 1}:`);
    console.log('- ID:', emb.id);
    console.log('- Document ID:', emb.account_data_source_id);
    console.log('- Embedding type:', typeof emb.embedding);
    console.log('- Is Array?:', Array.isArray(emb.embedding));
    
    if (emb.embedding) {
      console.log('- Length:', emb.embedding.length);
      console.log('- First 5 values:', emb.embedding.slice(0, 5));
      console.log('- Contains numbers?:', emb.embedding.slice(0, 5).every(v => typeof v === 'number'));
      
      // Check for all zeros
      const nonZeroCount = emb.embedding.filter(v => v !== 0).length;
      console.log(`- Non-zero values: ${nonZeroCount}/${emb.embedding.length}`);
      
      // Check for NaN or null
      const nanCount = emb.embedding.filter(v => isNaN(v) || v === null).length;
      console.log(`- NaN/null values: ${nanCount}`);
      
      // Calculate magnitude (should be ~1 for normalized embeddings)
      const magnitude = Math.sqrt(emb.embedding.reduce((sum, v) => sum + (v * v), 0));
      console.log(`- Magnitude: ${magnitude.toFixed(4)}`);
    } else {
      console.log('- ⚠️ Embedding is null or undefined');
    }
  });
  
  // 3. Test manual cosine similarity
  console.log('\n3️⃣ Testing manual cosine similarity:');
  if (embeddings.length >= 2 && embeddings[0].embedding && embeddings[1].embedding) {
    const vec1 = embeddings[0].embedding;
    const vec2 = embeddings[1].embedding;
    
    // Manual calculation with debug
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < Math.min(10, vec1.length); i++) {
      const v1 = vec1[i];
      const v2 = vec2[i];
      console.log(`  Position ${i}: vec1=${v1}, vec2=${v2}, product=${v1 * v2}`);
      dotProduct += v1 * v2;
      norm1 += v1 * v1;
      norm2 += v2 * v2;
    }
    
    console.log('\nCalculation results:');
    console.log(`- Dot product (first 10): ${dotProduct}`);
    console.log(`- Norm1 (first 10): ${Math.sqrt(norm1)}`);
    console.log(`- Norm2 (first 10): ${Math.sqrt(norm2)}`);
  }
  
  // 4. Check if embeddings are strings that need parsing
  console.log('\n4️⃣ Checking if embeddings need parsing:');
  const firstEmb = embeddings[0].embedding;
  if (typeof firstEmb === 'string') {
    console.log('❗ Embeddings are stored as strings!');
    try {
      const parsed = JSON.parse(firstEmb);
      console.log('- Parsed successfully');
      console.log('- Parsed type:', typeof parsed);
      console.log('- Is Array?:', Array.isArray(parsed));
      console.log('- Length:', parsed.length);
      console.log('- First 5 values:', parsed.slice(0, 5));
    } catch (e) {
      console.log('- Failed to parse as JSON:', e.message);
    }
  }
  
  // 5. Check database column type
  console.log('\n5️⃣ Recommendations:');
  console.log('- If embeddings are all zeros: Edge function may not be running');
  console.log('- If embeddings are strings: Need to JSON.parse() before use');
  console.log('- If magnitudes are 0: Embeddings are not being generated properly');
  console.log('- If NaN values exist: Data corruption in storage or retrieval');
};

console.log('✅ Test function loaded. Run: await testEmbeddingFormat()'); 