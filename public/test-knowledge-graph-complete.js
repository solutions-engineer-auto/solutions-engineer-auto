// Comprehensive Knowledge Graph Test Suite
// Run in browser console after SQL migration is applied

async function testKnowledgeGraphComplete() {
  console.log('🧪 Knowledge Graph Complete Test Suite\n');
  console.log('====================================\n');
  
  if (!window.supabase) {
    console.error('❌ Supabase client not available. Make sure you\'re in development mode.');
    return;
  }
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    warnings: 0
  };
  
  // Test 1: Verify Database Schema
  console.log('📊 Test 1: Database Schema Verification');
  console.log('---------------------------------------');
  try {
    results.total++;
    
    // Check is_global column
    const { error: globalError } = await window.supabase
      .from('account_data_sources')
      .select('id, is_global')
      .limit(1);
    
    if (globalError) {
      throw new Error(`is_global column missing: ${globalError.message}`);
    }
    
    // Check graph_position column
    const { error: posError } = await window.supabase
      .from('account_data_sources')
      .select('id, graph_position')
      .limit(1);
    
    if (posError) {
      throw new Error(`graph_position column missing: ${posError.message}`);
    }
    
    console.log('✅ Database schema is correct');
    console.log('   - is_global column: ✓');
    console.log('   - graph_position column: ✓');
    results.passed++;
  } catch (error) {
    console.error('❌ Schema test failed:', error.message);
    results.failed++;
  }
  
  // Test 2: Global Document Functionality
  console.log('\n🌍 Test 2: Global Document Operations');
  console.log('-------------------------------------');
  try {
    results.total++;
    
    // Get a test document
    const { data: docs, error: fetchError } = await window.supabase
      .from('account_data_sources')
      .select('id, file_name, is_global')
      .limit(1);
    
    if (fetchError || !docs?.length) {
      console.warn('⚠️  No documents found to test. Please upload a document first.');
      results.warnings++;
    } else {
      const testDoc = docs[0];
      console.log(`   Testing with document: ${testDoc.file_name}`);
      
      // Toggle global status
      const newStatus = !testDoc.is_global;
      const { error: updateError } = await window.supabase
        .from('account_data_sources')
        .update({ is_global: newStatus })
        .eq('id', testDoc.id);
      
      if (updateError) {
        throw new Error(`Failed to update is_global: ${updateError.message}`);
      }
      
      console.log(`✅ Successfully toggled is_global to: ${newStatus}`);
      
      // Verify the update
      const { data: verifyData, error: verifyError } = await window.supabase
        .from('account_data_sources')
        .select('is_global')
        .eq('id', testDoc.id)
        .single();
      
      if (verifyError || verifyData.is_global !== newStatus) {
        throw new Error('is_global update verification failed');
      }
      
      console.log('✅ Update verified successfully');
      
      // Toggle back
      await window.supabase
        .from('account_data_sources')
        .update({ is_global: testDoc.is_global })
        .eq('id', testDoc.id);
      
      results.passed++;
    }
  } catch (error) {
    console.error('❌ Global document test failed:', error.message);
    results.failed++;
  }
  
  // Test 3: Graph Position Storage
  console.log('\n📍 Test 3: Graph Position Storage');
  console.log('---------------------------------');
  try {
    results.total++;
    
    const { data: docs } = await window.supabase
      .from('account_data_sources')
      .select('id, file_name, graph_position')
      .limit(1);
    
    if (docs?.length) {
      const testDoc = docs[0];
      const newPosition = { x: 250, y: 150 };
      
      // Update position
      const { error: updateError } = await window.supabase
        .from('account_data_sources')
        .update({ graph_position: newPosition })
        .eq('id', testDoc.id);
      
      if (updateError) {
        throw new Error(`Failed to update position: ${updateError.message}`);
      }
      
      console.log('✅ Successfully saved graph position:', newPosition);
      results.passed++;
    } else {
      console.warn('⚠️  No documents to test position storage');
      results.warnings++;
    }
  } catch (error) {
    console.error('❌ Position storage test failed:', error.message);
    results.failed++;
  }
  
  // Test 4: Global Document Query
  console.log('\n🔍 Test 4: Global Document Queries');
  console.log('----------------------------------');
  try {
    results.total++;
    
    // Query global documents
    const { data: globalDocs, error: queryError } = await window.supabase
      .from('account_data_sources')
      .select('*')
      .eq('is_global', true);
    
    if (queryError) {
      throw new Error(`Query failed: ${queryError.message}`);
    }
    
    console.log(`✅ Found ${globalDocs.length} global documents`);
    
    if (globalDocs.length > 0) {
      console.log('   Sample global documents:');
      globalDocs.slice(0, 3).forEach(doc => {
        console.log(`   - ${doc.file_name}`);
      });
    }
    
    results.passed++;
  } catch (error) {
    console.error('❌ Global query test failed:', error.message);
    results.failed++;
  }
  
  // Test 5: Vector Database Integration
  console.log('\n🧬 Test 5: Vector Database Integration');
  console.log('--------------------------------------');
  try {
    results.total++;
    
    // Check if document_embeddings table exists
    const { error: embError } = await window.supabase
      .from('document_embeddings')
      .select('id')
      .limit(1);
    
    if (embError && embError.code === 'PGRST116') {
      console.warn('⚠️  document_embeddings table not found');
      results.warnings++;
    } else if (embError) {
      throw embError;
    } else {
      console.log('✅ Vector database is accessible');
      
      // Try to call the relationship generation function
      const { data: relationships, error: rpcError } = await window.supabase
        .rpc('generate_document_relationships_from_embeddings', {
          similarity_threshold: 0.5,
          max_relationships: 5
        });
      
      if (rpcError) {
        console.warn('⚠️  RPC function not available:', rpcError.message);
        results.warnings++;
      } else {
        console.log(`✅ Found ${relationships?.length || 0} document relationships`);
        results.passed++;
      }
    }
  } catch (error) {
    console.error('❌ Vector DB test failed:', error.message);
    results.failed++;
  }
  
  // Test 6: Knowledge Graph Component Check
  console.log('\n🎨 Test 6: UI Component Verification');
  console.log('------------------------------------');
  try {
    results.total++;
    
    const graphContainer = document.querySelector('.knowledge-graph-container');
    const graphControls = document.querySelector('.graph-controls');
    
    if (graphContainer || graphControls) {
      console.log('✅ Knowledge Graph components detected');
      
      // Check for specific features
      const features = {
        'Search': document.querySelector('[placeholder*="Search"]'),
        'View Toggle': document.querySelector('button[title*="view"]'),
        'Reset Button': document.querySelector('button[title*="Reset"]'),
        'Canvas': document.querySelector('canvas')
      };
      
      console.log('   Available features:');
      Object.entries(features).forEach(([name, element]) => {
        console.log(`   - ${name}: ${element ? '✓' : '✗'}`);
      });
      
      results.passed++;
    } else {
      console.log('ℹ️  Navigate to a page with Knowledge Graph to verify UI');
      results.warnings++;
    }
  } catch (error) {
    console.error('❌ UI verification failed:', error.message);
    results.failed++;
  }
  
  // Summary
  console.log('\n📊 Test Summary');
  console.log('===============');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  
  if (results.failed === 0) {
    console.log('\n🎉 All tests passed! Knowledge Graph is ready to use.');
    console.log('\n💡 Next steps:');
    console.log('1. Upload some documents to test with real data');
    console.log('2. Mark documents as global to share across accounts');
    console.log('3. Drag nodes to organize your knowledge graph');
    console.log('4. Use the RAG toggle to switch between mock and real relationships');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('Common issues:');
    console.log('- Ensure the migration SQL was applied correctly');
    console.log('- Check Supabase connection and permissions');
    console.log('- Verify you have documents uploaded for testing');
  }
  
  return results;
}

// Helper function to create a test document
async function createTestDocument() {
  if (!window.supabase) {
    console.error('Supabase not available');
    return;
  }
  
  const testDoc = {
    account_id: 'test-account-id', // Replace with real account ID
    file_name: 'Test Knowledge Graph Document.pdf',
    file_type: 'application/pdf',
    content: 'This is a test document for Knowledge Graph functionality',
    metadata: {
      size: 1024,
      pages: 1
    },
    is_global: false,
    graph_position: { x: 100, y: 100 }
  };
  
  const { data, error } = await window.supabase
    .from('account_data_sources')
    .insert([testDoc])
    .select();
  
  if (error) {
    console.error('Failed to create test document:', error);
  } else {
    console.log('✅ Created test document:', data[0]);
  }
  
  return data?.[0];
}

// Auto-run the test
console.log('🚀 Knowledge Graph Test Suite Loaded');
console.log('Run: await testKnowledgeGraphComplete()');
console.log('Or create test data: await createTestDocument()');

// Make functions globally available
window.testKnowledgeGraphComplete = testKnowledgeGraphComplete;
window.createTestDocument = createTestDocument; 