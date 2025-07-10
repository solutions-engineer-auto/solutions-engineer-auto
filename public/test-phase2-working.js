/**
 * Phase 2 Test Script - With Editor Reference Fix
 * This should now work correctly with dynamic editor references
 */

(function() {
  console.log('🚀 PHASE 2 TEST - WITH EDITOR REFERENCE FIX');
  console.log('=========================================');
  console.log('Time:', new Date().toISOString());
  
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
  
  console.log('\n✅ Initial checks passed');
  console.log('📊 Editor state:');
  console.log('- Document size:', editor.state.doc.content.size);
  console.log('- Diff mode:', storage.isActive);
  console.log('- Has getEditor function:', typeof storage.getEditor === 'function');
  
  // Test the getEditor function
  if (storage.getEditor) {
    const dynamicEditor = storage.getEditor();
    console.log('- Dynamic editor doc size:', dynamicEditor.state.doc.content.size);
    console.log('- Matches window.editor:', dynamicEditor === editor);
  }
  
  // Enable diff mode
  console.log('\n🔄 Enabling diff mode...');
  editor.commands.toggleDiffMode();
  console.log('- Diff mode now:', storage.isActive);
  
  // Test 1: Add a simple change
  console.log('\n📝 Test 1: Adding a change...');
  
  // Find some text to mark
  let testText = null;
  let testFrom = -1;
  let testTo = -1;
  
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text.length >= 10 && testFrom === -1) {
      testFrom = pos;
      testTo = pos + 10;
      testText = node.text.substring(0, 10);
      return false; // Stop searching
    }
  });
  
  if (testFrom !== -1) {
    console.log(`- Found text: "${testText}" at positions ${testFrom}-${testTo}`);
    
    // Add the change via command
    const success = editor.commands.command(({ commands }) => {
      return commands.addChange({
        type: 'modification',
        position: { from: testFrom, to: testTo },
        originalText: testText,
        suggestedText: 'CHANGED TEXT',
        metadata: { source: 'test-script' }
      });
    });
    
    console.log('- Add change command success:', success);
    
    // Wait a bit for async operations
    setTimeout(() => {
      console.log('\n🔍 Checking results...');
      
      // Check for marks in DOM
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log('- Marks in DOM:', marks.length);
      
      if (marks.length > 0) {
        console.log('✅ SUCCESS! Marks are visible!');
        marks.forEach((mark, i) => {
          console.log(`  Mark ${i + 1}:`, {
            type: mark.dataset.diffType,
            changeId: mark.dataset.changeId,
            text: mark.textContent
          });
        });
      } else {
        console.log('❌ No marks found in DOM');
        
        // Debug info
        console.log('\n🐛 Debug info:');
        console.log('- Changes in storage:', storage.changeManager.getChanges());
        console.log('- Document size check:');
        console.log('  - window.editor:', editor.state.doc.content.size);
        console.log('  - getEditor():', storage.getEditor()?.state.doc.content.size);
        
        // Check if CSS is loaded
        const cssLoaded = !!document.getElementById('diff-mark-styles');
        console.log('- CSS loaded:', cssLoaded);
        
        // Check if diffMark is in schema
        console.log('- diffMark in schema:', !!editor.schema.marks.diffMark);
      }
      
      // Test 2: Manual mark application
      console.log('\n📝 Test 2: Manual mark application...');
      editor.chain()
        .setTextSelection({ from: testFrom, to: testTo })
        .addMark('diffMark', {
          type: 'addition',
          changeId: 'manual-test',
          status: 'pending'
        })
        .run();
        
      setTimeout(() => {
        const manualMarks = document.querySelectorAll('[data-change-id="manual-test"]');
        console.log('- Manual marks found:', manualMarks.length);
        
        if (manualMarks.length > 0) {
          console.log('✅ Manual marking works!');
        } else {
          console.log('❌ Manual marking failed');
          console.log('- Current HTML:', editor.getHTML());
        }
      }, 100);
      
    }, 500);
  } else {
    console.error('❌ Could not find suitable text to test');
  }
  
  // Provide helper functions
  window.diffTest = {
    addChange: (from, to) => {
      return editor.commands.addChange({
        type: 'modification',
        position: { from, to },
        originalText: editor.state.doc.textBetween(from, to),
        suggestedText: 'CHANGED',
        metadata: { source: 'manual' }
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
    },
    
    debug: () => {
      console.log('Diff Debug Info:');
      console.log('- Extension loaded:', !!editor.storage.diffV2);
      console.log('- Diff mode active:', storage.isActive);
      console.log('- CSS loaded:', !!document.getElementById('diff-mark-styles'));
      console.log('- Changes in storage:', storage.changeManager.getChanges());
      console.log('- Marks in DOM:', document.querySelectorAll('[data-diff-type]').length);
      console.log('- Editor reference check:');
      console.log('  - window.editor size:', window.editor?.state.doc.content.size);
      console.log('  - getEditor() size:', storage.getEditor()?.state.doc.content.size);
    }
  };
  
  console.log('\n💡 Helper commands available:');
  console.log('- diffTest.addChange(from, to)');
  console.log('- diffTest.listChanges()');
  console.log('- diffTest.clearAll()');
  console.log('- diffTest.debug()');
  
})(); 