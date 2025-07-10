/**
 * Simple Multiple Changes Test - Phase 2
 * Tests multiple modifications and deletions (no additions yet)
 */

console.log('🔢 Simple Multiple Changes Test');
console.log('===============================');

async function runSimpleMultipleTest() {
  // Wait for editor
  const checkReady = setInterval(async () => {
    if (!window.editor || !window.editor.state || window.editor.state.doc.content.size <= 2) {
      return;
    }
    
    clearInterval(checkReady);
    const editor = window.editor;
    const storage = editor.storage.diffV2;
    
    if (!storage) {
      console.error('❌ Diff extension not loaded');
      return;
    }
    
    console.log('✅ Editor ready');
    
    // Clean state
    storage.changeManager.clear();
    if (storage.isActive) {
      editor.commands.toggleDiffMode();
    }
    
    // Enable diff mode
    editor.commands.toggleDiffMode();
    console.log('✅ Diff mode enabled');
    
    // Get document text
    const docText = editor.state.doc.textContent;
    console.log('\n📄 Document length:', docText.length);
    
    // Create simple, non-overlapping changes
    const changes = [];
    
    // Change 1: Modification near start
    if (docText.length > 20) {
      changes.push({
        type: 'modification',
        originalText: docText.substring(5, 10),
        suggestedText: 'EDIT1',
        position: { from: 5, to: 10 }
      });
    }
    
    // Change 2: Deletion in middle
    if (docText.length > 40) {
      changes.push({
        type: 'deletion',
        originalText: docText.substring(25, 30),
        suggestedText: '',
        position: { from: 25, to: 30 }
      });
    }
    
    // Change 3: Another modification further away
    if (docText.length > 60) {
      changes.push({
        type: 'modification',
        originalText: docText.substring(45, 50),
        suggestedText: 'EDIT2',
        position: { from: 45, to: 50 }
      });
    }
    
    console.log(`\n📝 Adding ${changes.length} changes...`);
    
    // Add changes one by one with delay
    let successCount = 0;
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      console.log(`\nChange ${i + 1}:`, {
        type: change.type,
        from: change.position.from,
        to: change.position.to,
        original: change.originalText,
        suggested: change.suggestedText
      });
      
      const success = editor.commands.addChange(change);
      if (success) {
        successCount++;
        console.log('✅ Added successfully');
      } else {
        console.log('❌ Failed to add');
      }
      
      // Wait between changes
      await new Promise(r => setTimeout(r, 200));
    }
    
    console.log(`\n✅ Added ${successCount}/${changes.length} changes`);
    
    // Check marks after a delay
    setTimeout(() => {
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log(`\n📊 Marks in DOM: ${marks.length}`);
      
      marks.forEach((mark, i) => {
        console.log(`Mark ${i + 1}:`, {
          type: mark.dataset.diffType,
          changeId: mark.dataset.changeId,
          text: mark.textContent
        });
      });
      
      console.log('\n💡 Click on any highlight to test accept/reject');
    }, 500);
    
  }, 100);
}

// Run the test
runSimpleMultipleTest();

// Helper to manually add test changes
window.addTestChanges = () => {
  const editor = window.editor;
  if (!editor) return;
  
  const text = editor.state.doc.textContent;
  
  // Add 3 simple modifications
  const changes = [
    { from: 10, to: 15 },
    { from: 30, to: 35 },
    { from: 50, to: 55 }
  ];
  
  changes.forEach((pos, i) => {
    if (text.length > pos.to) {
      editor.commands.addChange({
        type: 'modification',
        originalText: text.substring(pos.from, pos.to),
        suggestedText: `CHANGE${i+1}`,
        position: pos
      });
    }
  });
  
  console.log('✅ Test changes added');
};

console.log('\n💡 Helper: addTestChanges() - Add 3 test modifications'); 