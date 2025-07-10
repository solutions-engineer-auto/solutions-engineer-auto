/**
 * Test script for the FIXED diff system
 * This should now work properly with the corrected editor references
 */

(function() {
  console.log('🔧 TESTING FIXED DIFF SYSTEM');
  console.log('===========================');
  
  if (!window.editor) {
    console.error('❌ No editor found');
    return;
  }
  
  const editor = window.editor;
  const storage = editor.storage.diffV2;
  
  if (!storage) {
    console.error('❌ Diff extension not loaded');
    return;
  }
  
  console.log('✅ Editor and diff extension found');
  console.log('📊 Initial state:');
  console.log('- Document size:', editor.state.doc.content.size);
  console.log('- Diff mode active:', storage.isActive);
  console.log('- Change manager:', !!storage.changeManager);
  console.log('- Has editor reference:', !!storage.changeManager?.editor);
  
  // Enable diff mode if not active
  if (!storage.isActive) {
    console.log('\n🔄 Enabling diff mode...');
    editor.commands.toggleDiffMode();
    console.log('- Diff mode now active:', storage.isActive);
  }
  
  // Find a safe text position
  console.log('\n🎯 Finding text to mark...');
  let testPos = null;
  
  editor.state.doc.descendants((node, pos) => {
    if (!testPos && node.isText && node.text.length > 10) {
      testPos = {
        from: pos,
        to: pos + Math.min(10, node.text.length),
        text: node.text.substring(0, 10)
      };
      return false;
    }
  });
  
  if (!testPos) {
    console.error('❌ No suitable text found');
    return;
  }
  
  console.log(`✅ Found text at ${testPos.from}-${testPos.to}: "${testPos.text}"`);
  
  // Add a test change
  console.log('\n📝 Adding test change...');
  const change = {
    id: `test-${Date.now()}`,
    type: 'modification',
    position: { from: testPos.from, to: testPos.to },
    originalText: testPos.text,
    suggestedText: 'MODIFIED',
    status: 'pending'
  };
  
  // Verify editor reference is correct
  console.log('🔍 Verifying editor references:');
  console.log('- window.editor doc size:', editor.state.doc.content.size);
  console.log('- changeManager.editor doc size:', storage.changeManager.editor.state.doc.content.size);
  console.log('- Are they the same?', editor === storage.changeManager.editor);
  
  const success = editor.commands.addChange(change);
  console.log('- Command success:', success);
  
  // Wait and check for marks
  setTimeout(() => {
    console.log('\n🔍 Checking for marks...');
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log('- Marks found:', marks.length);
    
    if (marks.length > 0) {
      console.log('✅ SUCCESS! Marks are visible!');
      marks.forEach((mark, i) => {
        console.log(`  Mark ${i + 1}:`, {
          type: mark.getAttribute('data-diff-type'),
          changeId: mark.getAttribute('data-change-id'),
          text: mark.textContent,
          className: mark.className
        });
      });
      
      // Try clicking the first mark
      console.log('\n🖱️ Clicking first mark to trigger overlay...');
      marks[0].click();
      
      setTimeout(() => {
        const overlay = document.querySelector('.diff-overlay');
        if (overlay) {
          console.log('✅ Overlay appeared!');
        } else {
          console.log('❌ No overlay found');
        }
      }, 100);
    } else {
      console.error('❌ No marks found in DOM');
      console.log('Debugging info:');
      console.log('- Changes in storage:', storage.changeManager.getChanges());
      console.log('- Diff mode active:', storage.isActive);
      console.log('- Schema has diffMark:', !!editor.schema.marks.diffMark);
    }
  }, 500);
  
  // Export helper for manual testing
  window.diffFixed = {
    addChange: (from, to) => {
      const text = editor.state.doc.textBetween(from, to);
      editor.commands.addChange({
        id: `manual-${Date.now()}`,
        type: 'modification',
        position: { from, to },
        originalText: text,
        suggestedText: 'CHANGED',
        status: 'pending'
      });
    },
    
    listChanges: () => {
      const changes = storage.changeManager.getChanges();
      console.table(changes);
      return changes;
    },
    
    clearAll: () => {
      storage.changeManager.clear();
      editor.commands.toggleDiffMode();
      editor.commands.toggleDiffMode();
      console.log('Cleared all changes and reset diff mode');
    }
  };
  
  console.log('\n💡 Helper commands available:');
  console.log('- diffFixed.addChange(from, to) - Add a change at specific positions');
  console.log('- diffFixed.listChanges() - List all changes');
  console.log('- diffFixed.clearAll() - Clear all changes and reset');
})(); 