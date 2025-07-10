// Test script for undo functionality with diff overlays
console.log('🔄 Testing Undo Fix for Diff Overlays\n');

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
  
  // Enable diff mode
  editor.commands.toggleDiffMode();
  
  // Add test content
  editor.commands.setContent('<p>This text will be changed to TEST after accepting.</p>');
  
  // Find the word "changed"
  let foundPos = { from: -1, to: -1 };
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text.includes('changed')) {
      const index = node.text.indexOf('changed');
      foundPos.from = pos + index;
      foundPos.to = pos + index + 'changed'.length;
      return false;
    }
  });
  
  if (foundPos.from === -1) {
    console.error('❌ Could not find test word');
    return;
  }
  
  // Create a test change
  const change = {
    type: 'modification',
    originalText: 'changed',
    suggestedText: 'TEST',
    position: foundPos,
    instruction: 'Test change for undo'
  };
  
  console.log('📝 Adding change:', change);
  editor.commands.addChange(change);
  
  console.log('\n📋 TEST INSTRUCTIONS:');
  console.log('1. Click on the cyan "changed" text');
  console.log('2. Click "Confirm" to accept the change');
  console.log('3. The text will change to "TEST"');
  console.log('4. Press Cmd+Z (or Ctrl+Z) to undo');
  console.log('5. The cyan highlight should return');
  console.log('6. Click on it again - the overlay should appear!');
  console.log('');
  console.log('✅ If the overlay appears after undo, the fix is working!');
  console.log('❌ If clicking does nothing after undo, the issue persists.');
  
  // Helper to check mark state
  window.checkMarks = () => {
    const marks = document.querySelectorAll('.diff-mark');
    console.log('\n🔍 Current marks in document:', marks.length);
    marks.forEach((mark, i) => {
      console.log(`Mark ${i + 1}:`, {
        changeId: mark.getAttribute('data-change-id'),
        type: mark.getAttribute('data-diff-type'),
        originalText: mark.getAttribute('data-original-text'),
        suggestedText: mark.getAttribute('data-suggested-text'),
        text: mark.textContent
      });
    });
  };
  
  console.log('\n💡 TIP: Run checkMarks() to see current mark attributes');
})(); 