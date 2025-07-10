/**
 * Multiple Changes Test - Phase 2
 * Tests multiple highlights and overlapping scenarios
 */

console.log('🔢 Multiple Changes Test');
console.log('=======================');

// Wait for editor
function waitForEditor() {
  return new Promise((resolve) => {
    const check = setInterval(() => {
      if (window.editor && window.editor.state && window.editor.state.doc.content.size > 2) {
        clearInterval(check);
        resolve(window.editor);
      }
    }, 100);
  });
}

async function runMultipleChangesTest() {
  try {
    console.log('⏳ Waiting for editor...');
    const editor = await waitForEditor();
    console.log('✅ Editor ready');
    
    const storage = editor.storage.diffV2;
    if (!storage) {
      throw new Error('Diff extension not loaded');
    }
    
    // Clear and ensure clean state
    storage.changeManager.clear();
    
    // Ensure diff mode is OFF first, then turn it ON
    if (storage.isActive) {
      editor.commands.toggleDiffMode();
    }
    
    // Now enable it
    editor.commands.toggleDiffMode();
    console.log('✅ Diff mode enabled (clean state)');
    
    // Get document content for reference
    const docText = editor.state.doc.textContent;
    console.log('\n📄 Document preview:', docText.substring(0, 100) + '...');
    
    // Add multiple changes
    console.log('\n🎯 Adding multiple changes...');
    
    // Create non-overlapping changes at safe positions
    const changes = [];
    
    // Change 1: Modification at beginning (if enough text)
    if (docText.length > 20) {
      const word1Start = 10;
      const word1End = Math.min(15, docText.length);
      changes.push({
        type: 'modification',
        originalText: docText.substring(word1Start, word1End),
        suggestedText: 'MODIFIED',
        position: { from: word1Start, to: word1End }
      });
    }
    
    // Change 2: Addition at a safe distance
    if (docText.length > 40) {
      const additionPos = 30;
      changes.push({
        type: 'addition',
        originalText: '',
        suggestedText: ' [ADDED] ',
        position: { from: additionPos, to: additionPos }
      });
    }
    
    // Change 3: Deletion further away
    if (docText.length > 60) {
      const delStart = 50;
      const delEnd = Math.min(55, docText.length - 5);
      changes.push({
        type: 'deletion',
        originalText: docText.substring(delStart, delEnd),
        suggestedText: '',
        position: { from: delStart, to: delEnd }
      });
    }
    
    console.log(`\n📝 Prepared ${changes.length} non-overlapping changes:`);
    
    // Add each change with details (sequentially to avoid conflicts)
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      console.log(`\nAdding change ${i + 1}:`, {
        type: change.type,
        from: change.position.from,
        to: change.position.to,
        originalText: change.originalText,
        suggestedText: change.suggestedText
      });
      
      try {
        const success = editor.commands.addChange(change);
        console.log(`Result: ${success ? '✅ Success' : '❌ Failed'}`);
        
        // Small delay between changes to avoid conflicts
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Error adding change ${i + 1}:`, error.message);
      }
    }
    
    // Wait for marks to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check marks
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log(`\n📊 Found ${marks.length} marks`);
    
    // Display mark details
    marks.forEach((mark, index) => {
      console.log(`\nMark ${index + 1}:`, {
        type: mark.dataset.diffType,
        changeId: mark.dataset.changeId,
        text: mark.textContent,
        color: window.getComputedStyle(mark).backgroundColor
      });
    });
    
    // Test clicking different marks
    console.log('\n🖱️ Testing overlay for each mark...');
    
    for (let i = 0; i < marks.length; i++) {
      console.log(`\nTesting mark ${i + 1}...`);
      
      // Click mark
      marks[i].dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      // Wait for overlay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const overlay = document.querySelector('.diff-overlay');
      if (overlay) {
        console.log(`✅ Overlay shown for mark ${i + 1}`);
        
        // Hide it before testing next
        document.body.click();
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log(`❌ No overlay for mark ${i + 1}`);
      }
    }
    
    console.log('\n✅ Multiple changes test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
runMultipleChangesTest();

// Helper functions
window.multiTest = {
  // Add a batch of test changes
  addBatch: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const docText = editor.state.doc.textContent;
    const words = docText.split(/\s+/);
    
    // Find 3 random words to modify
    const changes = [];
    for (let i = 0; i < 3 && i < words.length; i++) {
      const wordIndex = Math.floor(Math.random() * Math.min(10, words.length));
      const word = words[wordIndex];
      if (word && word.length > 3) {
        // Find position of this word
        const pos = docText.indexOf(word);
        if (pos !== -1) {
          changes.push({
            type: ['modification', 'addition', 'deletion'][i % 3],
            originalText: word,
            suggestedText: word.toUpperCase(),
            position: { from: pos, to: pos + word.length }  // 0-indexed
          });
        }
      }
    }
    
    changes.forEach(change => {
      editor.commands.addChange(change);
    });
    
    console.log(`✅ Added ${changes.length} changes`);
  },
  
  // Accept all visible changes
  acceptAll: async () => {
    const marks = document.querySelectorAll('[data-diff-type]');
    for (const mark of marks) {
      mark.click();
      await new Promise(r => setTimeout(r, 100));
      const acceptBtn = document.querySelector('.diff-accept');
      if (acceptBtn) {
        acceptBtn.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        await new Promise(r => setTimeout(r, 100));
      }
    }
    console.log('✅ Accepted all changes');
  },
  
  // Show stats
  stats: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const storage = editor.storage.diffV2;
    const stats = storage.changeManager.getStatistics();
    console.table(stats);
    
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log(`Visible marks: ${marks.length}`);
  }
};

console.log('\n💡 Helpers:');
console.log('- multiTest.addBatch() - Add random changes');
console.log('- multiTest.acceptAll() - Accept all visible changes');
console.log('- multiTest.stats() - Show statistics'); 