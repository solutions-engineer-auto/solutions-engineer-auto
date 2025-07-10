/**
 * Manual test for DiffExtension
 * 
 * Run this in the browser console when the document editor is open
 * to verify the DiffExtension is working correctly.
 */

// Test 1: Check if DiffExtension is loaded
console.log('=== DiffExtension Manual Test ===');

const testDiffExtension = () => {
  // Get the editor instance from the page
  const editor = window.editor; // You'll need to expose this in DocumentEditorPage
  
  if (!editor) {
    console.error('❌ Editor not found. Make sure to expose window.editor in DocumentEditorPage');
    return;
  }
  
  console.log('✅ Editor found');
  
  // Check if DiffExtension is loaded
  const diffExtension = editor.extensionManager.extensions.find(ext => ext.name === 'diff');
  if (!diffExtension) {
    console.error('❌ DiffExtension not loaded. Check feature flag.');
    return;
  }
  
  console.log('✅ DiffExtension loaded');
  
  // Test 2: Selection Handler
  console.log('\n--- Testing SelectionHandler ---');
  
  // Create a test selection
  editor.commands.setContent('<p>First paragraph for testing.</p><p>Second paragraph here.</p><p>Third paragraph content.</p>');
  editor.commands.setTextSelection({ from: 5, to: 20 });
  
  try {
    const zone = editor.commands.getQuarantineZone('paragraph');
    console.log('✅ Quarantine zone created:', zone);
    console.log('  - ID:', zone.id);
    console.log('  - Content:', zone.content);
    console.log('  - Boundaries:', zone.boundaries);
    console.log('  - Context before:', zone.context.before);
    console.log('  - Context after:', zone.context.after);
  } catch (error) {
    console.error('❌ Failed to create quarantine zone:', error);
  }
  
  // Test 3: Context Builder
  console.log('\n--- Testing ContextBuilder ---');
  
  try {
    const context = editor.commands.buildAIContext('Make this more concise');
    console.log('✅ AI context built:', context);
    console.log('  - Instruction:', context.instruction);
    console.log('  - Mode:', context.mode);
    console.log('  - Document type:', context.context.documentType);
    console.log('  - Complexity:', context.metadata.instructionComplexity);
  } catch (error) {
    console.error('❌ Failed to build AI context:', error);
  }
  
  // Test 4: Position Recovery
  console.log('\n--- Testing Position Recovery ---');
  
  const testPositionRecovery = () => {
    // Get initial zone
    editor.commands.setTextSelection({ from: 31, to: 55 });
    const zone1 = editor.commands.getQuarantineZone('paragraph');
    console.log('✅ Initial zone created with ID:', zone1.id);
    
    // Modify document before the selection
    editor.commands.insertContentAt(0, 'New text added. ');
    console.log('✅ Document modified');
    
    // Try to recover position
    const storage = diffExtension.storage;
    const handler = storage.selectionHandler;
    const recovered = handler.recoverPosition(zone1.id);
    
    if (recovered) {
      console.log('✅ Position recovered:', recovered);
      console.log('  - Original:', zone1.boundaries.from, '-', zone1.boundaries.to);
      console.log('  - Recovered:', recovered.from, '-', recovered.to);
    } else {
      console.error('❌ Position recovery failed');
    }
  };
  
  testPositionRecovery();
  
  // Test 5: Keyboard shortcut
  console.log('\n--- Testing Keyboard Shortcut ---');
  console.log('ℹ️  Select some text and press Cmd/Ctrl + K');
  console.log('    Check console for "onRequestEdit" callback');
  
  console.log('\n=== Test Complete ===');
};

// Instructions for use
console.log('To run the test:');
console.log('1. Add this to DocumentEditorPage: window.editor = editor;');
console.log('2. Open a document in the editor');
console.log('3. Run: testDiffExtension()');
console.log('4. Or copy and paste this entire file into the console');

// Export for use
window.testDiffExtension = testDiffExtension; 