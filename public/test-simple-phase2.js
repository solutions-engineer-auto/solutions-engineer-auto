// Simple Phase 2 Test Script
console.log('🧪 Simple Phase 2 Test');
console.log('====================');

// Wait for editor
const checkReady = setInterval(() => {
  const editor = window.editor;
  if (editor && editor.state.doc.content.size > 2) {
    clearInterval(checkReady);
    runTest(editor);
  }
}, 100);

function runTest(editor) {
  console.log('✅ Editor ready! Doc size:', editor.state.doc.content.size);
  
  // Check if diff extension is loaded
  const diffV2 = editor.storage.diffV2;
  if (!diffV2) {
    console.error('❌ DiffV2 extension not found!');
    console.log('Make sure aiDiff feature flag is enabled:');
    console.log("localStorage.setItem('featureFlags', JSON.stringify({ aiDiff: true }));");
    return;
  }
  
  console.log('✅ DiffV2 extension loaded');
  
  // Enable diff mode
  console.log('\n🔄 Enabling diff mode...');
  editor.commands.toggleDiffMode();
  console.log('- Diff mode active:', diffV2.isActive);
  
  // Add a simple test change
  console.log('\n➕ Adding test change...');
  const success = editor.commands.addChange({
    type: 'modification',
    originalText: 'TEMPLATE:',
    suggestedText: 'MODIFIED:',
    position: { from: 1, to: 11 }
  });
  
  console.log('- Change added:', success);
  
  // Check for marks
  setTimeout(() => {
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log('\n📊 Results:');
    console.log('- Marks in DOM:', marks.length);
    
    if (marks.length > 0) {
      console.log('✅ SUCCESS! You should see a cyan highlight');
      console.log('\n👆 Try clicking the highlighted text');
    } else {
      console.log('❌ No marks visible - check console for errors');
    }
  }, 100);
}

console.log('Starting test...'); 