// Test script for the Debug Diff Button
console.log('🧪 Debug Diff Button Test\n');

(async function() {
  // Wait for editor
  let attempts = 0;
  while (!window.editor || window.editor.state.doc.content.size <= 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (++attempts > 50) {
      console.error('❌ Editor not found');
      return;
    }
  }
  
  const editor = window.editor;
  console.log('✅ Editor ready');
  
  // Check if diff feature is enabled
  const featureFlags = JSON.parse(localStorage.getItem('featureFlags') || '{}');
  if (!featureFlags.aiDiff) {
    console.log('⚠️ AI Diff feature is not enabled. Enabling it now...');
    localStorage.setItem('featureFlags', JSON.stringify({ aiDiff: true }));
    console.log('✅ AI Diff feature enabled. Please reload the page for the button to appear.');
    return;
  }
  
  // Add some test content
  editor.commands.setContent(`
    <p>This is a test document for the debug diff button.</p>
    <p>Select any word in this paragraph and click the 🧪 Test Diff button in the toolbar.</p>
    <p>The selected text will be highlighted in cyan and clicking it will show the overlay.</p>
  `);
  
  console.log('\n📋 INSTRUCTIONS:');
  console.log('1. Look for the "🧪 Test Diff" button in the toolbar (after the highlight button)');
  console.log('2. Select any word or phrase in the editor');
  console.log('3. Click the "🧪 Test Diff" button');
  console.log('4. The selected text will turn cyan');
  console.log('5. Click on the cyan text to see the overlay');
  console.log('6. Choose "Confirm" to replace with "TEST" or "Decline" to keep original');
  
  // Helper function to programmatically test
  window.autoTest = () => {
    console.log('\n🤖 Running automated test...');
    
    // Find and select the word "word"
    let foundPos = { from: -1, to: -1 };
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text.includes('word')) {
        const index = node.text.indexOf('word');
        foundPos.from = pos + index;
        foundPos.to = pos + index + 4;
        return false;
      }
    });
    
    if (foundPos.from === -1) {
      console.error('Could not find test word');
      return;
    }
    
    // Select the text
    editor.chain()
      .setTextSelection(foundPos)
      .run();
    
    console.log('✅ Selected "word" at positions', foundPos);
    console.log('⚠️ Now click the "🧪 Test Diff" button manually in the toolbar');
  };
  
  console.log('\n💡 TIP: Run autoTest() to automatically select a word for testing');
})(); 