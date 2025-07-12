// Test script to check vector database status
// Run this in the browser console to see what's happening

window.testVectorDB = async function() {
  const { supabase } = await import('/src/supabaseClient.js');
  
  console.log('🔍 Checking vector database status...\n');
  
  // 1. Check if document_embeddings table has any data
  const { error: embError, count } = await supabase
    .from('document_embeddings')
    .select('*', { count: 'exact', head: true });
    
  if (embError) {
    console.error('❌ Error checking embeddings:', embError);
  } else {
    console.log(`📊 Total embeddings in database: ${count || 0}`);
  }
  
  // 2. Check account_data_sources
  const { error: docError, count: docCount } = await supabase
    .from('account_data_sources')
    .select('*', { count: 'exact', head: true });
    
  if (docError) {
    console.error('❌ Error checking documents:', docError);
  } else {
    console.log(`📄 Total documents in database: ${docCount || 0}`);
  }
  
  // 3. Check a sample of documents to see their structure
  const { data: sampleDocs, error: sampleError } = await supabase
    .from('account_data_sources')
    .select('id, file_name, created_at, is_global')
    .limit(5);
    
  if (!sampleError && sampleDocs && sampleDocs.length > 0) {
    console.log('\n📋 Sample documents:');
    console.table(sampleDocs);
  }
  
  // 4. Check if any documents have embeddings
  const { data: docsWithEmbeddings } = await supabase
    .from('document_embeddings')
    .select('account_data_source_id')
    .limit(10);
    
  if (docsWithEmbeddings && docsWithEmbeddings.length > 0) {
    const uniqueDocs = new Set(docsWithEmbeddings.map(d => d.account_data_source_id));
    console.log(`\n✅ ${uniqueDocs.size} documents have embeddings`);
  } else {
    console.log('\n⚠️ No documents have embeddings yet');
    console.log('This is why the Knowledge Graph shows no relationships.');
    console.log('Documents need to be processed to generate embeddings.');
  }
  
  console.log('\n💡 To test with mock data, toggle "Use Mock Data" in the graph controls.');
};

console.log('✅ Test function loaded. Run: await testVectorDB()'); 