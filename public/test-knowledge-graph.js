// Test script for Knowledge Graph functionality
// Run this in the browser console while on the app

(function testKnowledgeGraph() {
  console.log('🧪 Testing Knowledge Graph Implementation...\n');
  
  // Test 1: Check if knowledgeStorage is available
  console.log('1️⃣ Testing knowledgeStorage utility:');
  if (window.knowledgeStorage) {
    console.error('❌ knowledgeStorage should not be exposed to window');
  } else {
    console.log('✅ knowledgeStorage is properly encapsulated');
  }
  
  // Test 2: Check localStorage
  console.log('\n2️⃣ Testing localStorage for global knowledge:');
  const globals = localStorage.getItem('se_auto_global_knowledge');
  if (globals) {
    console.log('✅ Global knowledge storage exists:', JSON.parse(globals));
  } else {
    console.log('ℹ️ No global knowledge markers yet');
  }
  
  // Test 3: Check if ForceGraph2D is loaded
  console.log('\n3️⃣ Testing graph library:');
  const hasGraphLib = document.querySelector('script[src*="react-force-graph"]');
  if (hasGraphLib) {
    console.log('✅ Graph library is loaded');
  } else {
    console.log('⚠️ Graph library may be loaded dynamically');
  }
  
  // Test 4: Simulate marking a document as global
  console.log('\n4️⃣ Simulating global document marking:');
  const testId = 'test-doc-' + Date.now();
  const event = new CustomEvent('globalKnowledgeUpdated', {
    detail: { action: 'add', documentId: testId }
  });
  window.dispatchEvent(event);
  console.log('✅ Dispatched global knowledge update event');
  
  // Test 5: Check view toggle
  console.log('\n5️⃣ Testing view mode toggle:');
  const accountId = window.location.pathname.split('/accounts/')[1];
  if (accountId) {
    const viewMode = localStorage.getItem(`viewMode_${accountId}`);
    console.log(`✅ View mode for account ${accountId}:`, viewMode || 'list (default)');
  } else {
    console.log('ℹ️ Navigate to an account page to test view mode');
  }
  
  console.log('\n✨ Knowledge Graph tests complete!');
  console.log('Navigate to an account page and toggle between List/Graph views to see it in action.');
})(); 