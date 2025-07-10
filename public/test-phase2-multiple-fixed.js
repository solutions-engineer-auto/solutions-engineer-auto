/**
 * Fixed Multiple Changes Test - Phase 2
 * Properly handles position tracking and avoids conflicts
 */

console.log('🔢 Fixed Multiple Changes Test');
console.log('=============================');

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

async function runFixedMultipleTest() {
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
    
    // Ensure diff mode is OFF first
    if (storage.isActive) {
      editor.commands.toggleDiffMode();
    }
    
    // Get document info
    const docText = editor.state.doc.textContent;
    const docSize = editor.state.doc.content.size;
    console.log('\n📄 Document info:', {
      size: docSize,
      textLength: docText.length,
      preview: docText.substring(0, 50) + '...'
    });
    
    // Enable diff mode
    editor.commands.toggleDiffMode();
    console.log('✅ Diff mode enabled');
    
    // Find safe word boundaries for changes
    console.log('\n🎯 Finding safe positions for changes...');
    
    // Helper to find word boundaries
    function findWordAt(text, startPos, maxPos) {
      // Find a word starting from startPos
      let from = startPos;
      let to = startPos;
      
      // Skip any whitespace
      while (from < maxPos && /\s/.test(text[from])) {
        from++;
      }
      
      if (from >= maxPos) return null;
      
      // Find word start
      to = from;
      while (to < maxPos && /\S/.test(text[to])) {
        to++;
      }
      
      if (to <= from) return null;
      
      return {
        from,
        to,
        text: text.substring(from, to)
      };
    }
    
    // Create changes at safe, non-overlapping positions
    const changes = [];
    const usedRanges = [];
    
    // Helper to check if range overlaps with used ranges
    function isRangeAvailable(from, to) {
      return !usedRanges.some(range => 
        (from >= range.from && from < range.to) ||
        (to > range.from && to <= range.to) ||
        (from <= range.from && to >= range.to)
      );
    }
    
    // Try to find 3 words to modify at different positions
    const positions = [10, 30, 50]; // Starting search positions
    
    for (let i = 0; i < positions.length && changes.length < 3; i++) {
      const word = findWordAt(docText, positions[i], Math.min(docText.length, 100));
      
      if (word && isRangeAvailable(word.from, word.to)) {
        const changeType = ['modification', 'deletion', 'modification'][changes.length];
        
        // Skip additions for now (they need special handling)
        if (changeType === 'addition') continue;
        
        changes.push({
          type: changeType,
          originalText: word.text,
          suggestedText: changeType === 'deletion' ? '' : word.text.toUpperCase(),
          position: { from: word.from, to: word.to }
        });
        
        usedRanges.push({ from: word.from, to: word.to });
        
        console.log(`\n✅ Change ${changes.length}:`, {
          type: changeType,
          from: word.from,
          to: word.to,
          text: word.text,
          suggestedText: changeType === 'deletion' ? '[DELETE]' : word.text.toUpperCase()
        });
      }
    }
    
    if (changes.length === 0) {
      throw new Error('Could not find suitable positions for changes');
    }
    
    console.log(`\n📝 Created ${changes.length} non-overlapping changes`);
    
    // Apply changes one by one with proper error handling
    let successCount = 0;
    
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      console.log(`\n[${i + 1}/${changes.length}] Applying ${change.type}...`);
      
      try {
        // Validate position is still valid
        const currentDocSize = editor.state.doc.content.size;
        if (change.position.to > currentDocSize) {
          console.warn('⚠️ Position out of bounds, skipping');
          continue;
        }
        
        const success = editor.commands.addChange(change);
        
        if (success) {
          successCount++;
          console.log('✅ Successfully added');
          
          // Small delay to let the mark render
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          console.log('❌ Failed to add change');
        }
      } catch (error) {
        console.error('❌ Error:', error.message);
      }
    }
    
    console.log(`\n📊 Results: ${successCount}/${changes.length} changes applied`);
    
    // Wait for all marks to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check what marks are visible
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log(`\n🎨 Visible marks: ${marks.length}`);
    
    marks.forEach((mark, index) => {
      const rect = mark.getBoundingClientRect();
      console.log(`\nMark ${index + 1}:`, {
        type: mark.dataset.diffType,
        changeId: mark.dataset.changeId,
        text: mark.textContent,
        visible: rect.width > 0 && rect.height > 0,
        style: {
          background: window.getComputedStyle(mark).backgroundColor,
          borderBottom: window.getComputedStyle(mark).borderBottom
        }
      });
    });
    
    // Test interaction with first mark
    if (marks.length > 0) {
      console.log('\n🖱️ Testing overlay on first mark...');
      
      marks[0].dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const overlay = document.querySelector('.diff-overlay');
      if (overlay) {
        console.log('✅ Overlay displayed successfully');
        
        // Check buttons
        const acceptBtn = overlay.querySelector('.diff-accept');
        const rejectBtn = overlay.querySelector('.diff-reject');
        
        console.log('Buttons found:', {
          accept: !!acceptBtn,
          reject: !!rejectBtn
        });
      } else {
        console.log('❌ No overlay found');
      }
    }
    
    console.log('\n✅ Fixed multiple changes test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
runFixedMultipleTest();

// Helpers for manual testing
window.fixedMultiTest = {
  // Clear all changes
  clear: () => {
    const editor = window.editor;
    if (!editor) return;
    
    editor.storage.diffV2.changeManager.clear();
    editor.commands.toggleDiffMode();
    editor.commands.toggleDiffMode();
    console.log('✅ Cleared all changes');
  },
  
  // Add a single safe change
  addOne: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const docText = editor.state.doc.textContent;
    const word = docText.match(/\b\w{4,}\b/); // Find first 4+ letter word
    
    if (word) {
      const pos = docText.indexOf(word[0]);
      const change = {
        type: 'modification',
        originalText: word[0],
        suggestedText: word[0].toUpperCase(),
        position: { from: pos, to: pos + word[0].length }
      };
      
      const success = editor.commands.addChange(change);
      console.log(success ? '✅ Added change' : '❌ Failed to add');
    }
  },
  
  // Show current state
  debug: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const storage = editor.storage.diffV2;
    const changes = storage.changeManager.getChanges();
    const marks = document.querySelectorAll('[data-diff-type]');
    
    console.log('Debug info:', {
      diffMode: storage.isActive,
      changeCount: changes.length,
      markCount: marks.length,
      docSize: editor.state.doc.content.size
    });
    
    console.table(changes.map(c => ({
      id: c.id.substring(0, 8),
      type: c.type,
      from: c.position.from,
      to: c.position.to,
      status: c.status,
      text: c.originalText
    })));
  }
};

console.log('\n💡 Manual helpers:');
console.log('- fixedMultiTest.clear() - Clear all changes');
console.log('- fixedMultiTest.addOne() - Add single change');
console.log('- fixedMultiTest.debug() - Show current state'); 