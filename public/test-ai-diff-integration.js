/**
 * Test AI Diff Integration
 * 
 * Run this in the browser console on the document editor page
 * to test the AI diff system integration.
 */

console.log('🧪 Testing AI Diff Integration...');

// Check if editor is available
if (!window.editor) {
  console.error('❌ Editor not found. Make sure you are on the document editor page.');
} else {
  console.log('✅ Editor found');
  
  // Check if diff extension is loaded
  const diffExtension = window.editor.extensionManager.extensions.find(ext => ext.name === 'diffExtension');
  if (!diffExtension) {
    console.error('❌ Diff extension not loaded');
  } else {
    console.log('✅ Diff extension loaded');
  }
  
  // Check if diff mode is available
  if (window.editor.commands.toggleDiffMode) {
    console.log('✅ Diff mode commands available');
  } else {
    console.error('❌ Diff mode commands not available');
  }
  
  // Test creating a diff mark directly
  const testDirectDiff = () => {
    console.log('\n📝 Test 1: Creating a diff mark directly');
    
    // Find some text to mark
    const doc = window.editor.state.doc;
    const searchText = 'the'; // Common word
    let found = false;
    
    doc.descendants((node, pos) => {
      if (!found && node.isText && node.text.includes(searchText)) {
        const index = node.text.indexOf(searchText);
        const from = pos + index;
        const to = from + searchText.length;
        
        // Create a diff mark
        window.editor.commands.addChange({
          type: 'modification',
          originalText: searchText,
          suggestedText: 'THE (AI suggestion)',
          position: { from, to },
          metadata: {
            confidence: 0.95,
            reason: 'Test AI suggestion'
          }
        });
        
        console.log(`✅ Created diff mark for "${searchText}" at position ${from}-${to}`);
        found = true;
      }
    });
    
    if (!found) {
      console.warn('⚠️ Could not find text to mark');
    }
  };
  
  // Test the AI Edit button
  const testAIEditButton = () => {
    console.log('\n📝 Test 2: AI Edit Button');
    console.log('Instructions:');
    console.log('1. Select some text in the editor');
    console.log('2. Click the "🧪 AI Edit" button in the toolbar');
    console.log('3. Enter an instruction like "make it more formal"');
    console.log('4. Wait for AI suggestions to appear as diff marks');
    console.log('5. Click on the marks to accept or reject');
  };
  
  // Run tests
  console.log('\n🚀 Running tests...\n');
  
  // Enable diff mode if not already enabled
  if (!window.editor.storage.diffV2?.isActive) {
    window.editor.commands.toggleDiffMode();
    console.log('✅ Enabled diff mode');
  }
  
  // Test 1
  testDirectDiff();
  
  // Test 2 instructions
  testAIEditButton();
  
  console.log('\n✨ Test complete! Check the editor for diff marks.');
} 