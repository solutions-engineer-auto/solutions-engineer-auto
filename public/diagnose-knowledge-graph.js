// Knowledge Graph Diagnostic Script
// Run this in browser console to diagnose edge/connection issues

async function diagnoseKnowledgeGraph() {
  console.log('🔍 Knowledge Graph Diagnostics\n');
  console.log('================================\n');
  
  if (!window.supabase) {
    console.error('❌ Supabase client not available');
    return;
  }
  
  const results = {
    hasDocuments: false,
    hasEmbeddings: false,
    rpcWorks: false,
    hasRelationships: false
  };
  
  // 1. Check if there are documents
  console.log('1️⃣ Checking for documents...');
  try {
    const { data: docs, error } = await window.supabase
      .from('account_data_sources')
      .select('id, file_name')
      .limit(5);
    
    if (error) throw error;
    
    results.hasDocuments = docs && docs.length > 0;
    console.log(`✅ Found ${docs?.length || 0} documents`);
    if (docs?.length > 0) {
      console.log('   Sample documents:');
      docs.forEach(doc => console.log(`   - ${doc.file_name}`));
    }
  } catch (error) {
    console.error('❌ Error checking documents:', error);
  }
  
  // 2. Check if embeddings exist
  console.log('\n2️⃣ Checking for embeddings...');
  try {
    const { data: embeddings, error } = await window.supabase
      .from('document_embeddings')
      .select('account_data_source_id, created_at')
      .limit(5);
    
    if (error) throw error;
    
    results.hasEmbeddings = embeddings && embeddings.length > 0;
    console.log(`✅ Found ${embeddings?.length || 0} embeddings`);
    
    // Count unique documents with embeddings
    const { data: embeddingCount } = await window.supabase
      .from('document_embeddings')
      .select('account_data_source_id', { count: 'exact', head: true });
    
    console.log(`   Total embeddings in database: ${embeddingCount || 0}`);
  } catch (error) {
    console.error('❌ Error checking embeddings:', error);
  }
  
  // 3. Test RPC function
  console.log('\n3️⃣ Testing RPC function...');
  try {
    const { data: relationships, error } = await window.supabase
      .rpc('generate_document_relationships_from_embeddings', {
        account_id_param: null,
        similarity_threshold: 0.3,  // Lower threshold to find more
        max_relationships: 50
      });
    
    if (error) {
      console.error('❌ RPC function error:', error);
      console.error('   Error code:', error.code);
      console.error('   Error details:', error.details);
      console.error('\n⚠️  APPLY THE FIX: Run the SQL from public/emergency-fix-rpc-edges.sql');
    } else {
      results.rpcWorks = true;
      results.hasRelationships = relationships && relationships.length > 0;
      console.log(`✅ RPC function works! Found ${relationships?.length || 0} relationships`);
      
      if (relationships?.length > 0) {
        console.log('   Sample relationships:');
        relationships.slice(0, 3).forEach(rel => {
          console.log(`   - ${rel.source_file_name} <-> ${rel.target_file_name} (${(rel.similarity * 100).toFixed(0)}% similar)`);
        });
      }
    }
  } catch (error) {
    console.error('❌ RPC test failed:', error);
  }
  
  // 4. Summary and recommendations
  console.log('\n📊 DIAGNOSIS SUMMARY');
  console.log('===================');
  console.log(`Documents exist: ${results.hasDocuments ? '✅ YES' : '❌ NO'}`);
  console.log(`Embeddings exist: ${results.hasEmbeddings ? '✅ YES' : '❌ NO'}`);
  console.log(`RPC function works: ${results.rpcWorks ? '✅ YES' : '❌ NO'}`);
  console.log(`Relationships found: ${results.hasRelationships ? '✅ YES' : '❌ NO'}`);
  
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');
  
  if (!results.hasDocuments) {
    console.log('1. Upload some documents first!');
  } else if (!results.hasEmbeddings) {
    console.log('1. Documents need embeddings generated');
    console.log('   - Check if your edge function is running');
    console.log('   - Embeddings should auto-generate on upload');
  } else if (!results.rpcWorks) {
    console.log('1. ⚠️  URGENT: Apply the RPC fix immediately!');
    console.log('   - Go to Supabase SQL Editor');
    console.log('   - Run the SQL from: public/emergency-fix-rpc-edges.sql');
    console.log('   - This fixes the VARCHAR/TEXT type mismatch');
  } else if (!results.hasRelationships) {
    console.log('1. Your documents might be too different');
    console.log('   - Try uploading similar documents');
    console.log('   - Lower the similarity threshold');
    console.log('   - Check if embeddings are being generated correctly');
  } else {
    console.log('✅ Everything looks good! Refresh the page to see connections.');
  }
  
  // 5. Quick fix attempt
  if (!results.rpcWorks) {
    console.log('\n🔧 Attempting quick fix...');
    console.log('Copy this SQL and run in Supabase:');
    console.log(`
DROP FUNCTION IF EXISTS generate_document_relationships_from_embeddings(uuid, double precision, integer);

CREATE OR REPLACE FUNCTION generate_document_relationships_from_embeddings(
  account_id_param UUID DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.7,
  max_relationships INT DEFAULT 50
)
RETURNS TABLE (
  source_id UUID,
  target_id UUID,
  similarity FLOAT,
  source_file_name VARCHAR,
  target_file_name VARCHAR
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH document_embeddings_summary AS (
    SELECT 
      de.account_data_source_id,
      ads.file_name,
      ads.account_id,
      (array_agg(de.embedding ORDER BY de.created_at))[1] as representative_embedding
    FROM document_embeddings de
    JOIN account_data_sources ads ON de.account_data_source_id = ads.id
    WHERE (account_id_param IS NULL OR ads.account_id = account_id_param)
    GROUP BY de.account_data_source_id, ads.file_name, ads.account_id
  ),
  document_pairs AS (
    SELECT 
      d1.account_data_source_id as source_id,
      d2.account_data_source_id as target_id,
      1 - (d1.representative_embedding <=> d2.representative_embedding) as similarity,
      d1.file_name as source_file_name,
      d2.file_name as target_file_name
    FROM document_embeddings_summary d1
    CROSS JOIN document_embeddings_summary d2
    WHERE d1.account_data_source_id != d2.account_data_source_id
      AND d1.account_data_source_id < d2.account_data_source_id
  )
  SELECT 
    dp.source_id,
    dp.target_id,
    dp.similarity,
    dp.source_file_name,
    dp.target_file_name
  FROM document_pairs dp
  WHERE dp.similarity > similarity_threshold
  ORDER BY dp.similarity DESC
  LIMIT max_relationships;
END;
$$;
    `);
  }
  
  return results;
}

// Auto-run
console.log('🚀 Knowledge Graph Diagnostic Tool Loaded');
console.log('Run: await diagnoseKnowledgeGraph()');

// Make globally available
window.diagnoseKnowledgeGraph = diagnoseKnowledgeGraph; 