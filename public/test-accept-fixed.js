// Test script - Verify accept functionality works without errors

console.log('🧪 ACCEPT FUNCTIONALITY TEST');
console.log('============================');

// Wait for editor
const checkEditor = setInterval(() => {
  const editor = window.editor;
  
  if (editor && editor.state.doc.content.size > 2) {
    clearInterval(checkEditor);
    runAcceptTest(editor);
  }
}, 100);

async function runAcceptTest(editor) {
  console.log('✅ Editor ready! Doc size:', editor.state.doc.content.size);
  
  // Get the diff extension storage
  const diffV2 = editor.storage.diffV2;
  if (!diffV2) {
    console.error('❌ DiffV2 extension not found!');
    return;
  }
  
  console.log('\n🎯 Current state:');
  console.log('- Diff mode active:', diffV2.isActive);
  console.log('- Changes in manager:', diffV2.changeManager.getChanges().length);
  
  // Enable diff mode if not active
  if (!diffV2.isActive) {
    console.log('\n🔄 Enabling diff mode...');
    editor.commands.toggleDiffMode();
  }
  
  // Add a test change
  console.log('\n➕ Adding test change...');
  const success = editor.commands.addChange({
    id: 'test-accept-' + Date.now(),
    type: 'modification',
    originalText: 'TEMPLATE:',
    suggestedText: 'MODIFIED:',
    position: { from: 1, to: 11 },
    instruction: 'Test accept functionality'
  });
  
  console.log('- Change added:', success);
  
  // Wait for mark to appear
  await new Promise(resolve => setTimeout(resolve, 100));
  
  const marks = document.querySelectorAll('[data-diff-type]');
  console.log('- Marks in DOM:', marks.length);
  
  if (marks.length > 0) {
    console.log('\n🖱️ Instructions:');
    console.log('1. Click the cyan highlighted text');
    console.log('2. Click the "Accept" button');
    console.log('3. Check console for any errors');
    console.log('\n✨ Expected result: No errors, overlay disappears');
    
    // Helper to manually accept the first change
    window.acceptFirstChange = () => {
      const changes = diffV2.changeManager.getChanges();
      if (changes.length > 0) {
        console.log('\n✅ Accepting change:', changes[0].id);
        editor.commands.acceptChange(changes[0].id);
        console.log('- Change accepted successfully!');
        console.log('- Status:', diffV2.changeManager.getChange(changes[0].id).status);
      }
    };
    
    console.log('\n💡 Or run: acceptFirstChange()');
  }
}

console.log('\nTest is starting...'); 