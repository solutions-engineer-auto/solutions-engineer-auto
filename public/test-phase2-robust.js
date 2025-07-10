/**
 * Robust Phase 2 Test - Handles initialization timing
 */

console.log('🔧 ROBUST PHASE 2 TEST');
console.log('=====================');

// Wait for editor to be fully initialized
function waitForEditor(callback) {
  if (window.editor && window.editor.state && window.editor.state.doc.content.size > 2) {
    console.log('✅ Editor is ready! Doc size:', window.editor.state.doc.content.size);
    callback(window.editor);
  } else {
    console.log('⏳ Waiting for editor initialization...');
    setTimeout(() => waitForEditor(callback), 100);
  }
}

// Main test function
function runTest(editor) {
  const storage = editor.storage.diffV2;
  
  if (!storage) {
    console.error('❌ Diff extension not loaded!');
    return;
  }
  
  console.log('\n📊 Initial state:');
  console.log('- Editor doc size:', editor.state.doc.content.size);
  console.log('- Diff mode active:', storage.isActive);
  console.log('- Overlay manager ready:', !!storage.overlayManager?.editor);
  
  // Clear any existing changes
  storage.changeManager.clear();
  
  // Enable diff mode
  if (!storage.isActive) {
    console.log('\n🔄 Enabling diff mode...');
    editor.commands.toggleDiffMode();
  }
  
  // Wait a bit for overlay manager to initialize
  setTimeout(() => {
    console.log('\n📝 Adding test change...');
    
    // Add change with current editor state
    const success = editor.commands.addChange({
      type: 'modification',
      position: { from: 0, to: 10 },  // 0-indexed positions
      originalText: 'TEMPLATE: ',
      suggestedText: 'UPDATED: ',
      metadata: { 
        source: 'robust-test',
        timestamp: new Date().toISOString()
      }
    });
    
    if (success) {
      console.log('✅ Change added successfully');
      
      // Check for marks
      setTimeout(() => {
        const marks = document.querySelectorAll('[data-diff-type]');
        console.log(`\n🎯 Found ${marks.length} mark(s)`);
        
        if (marks.length > 0) {
          console.log('✅ SUCCESS! Marks are visible!');
          
          marks.forEach((mark, i) => {
            console.log(`\nMark ${i + 1}:`, {
              type: mark.dataset.diffType,
              changeId: mark.dataset.changeId,
              text: mark.textContent,
              classes: mark.className
            });
          });
          
          console.log('\n💡 Click on the highlighted text to see accept/reject buttons');
          
          // Helper to test click
          window.robustClick = () => {
            const mark = document.querySelector('[data-diff-type]');
            if (mark) {
              console.log('🖱️ Simulating click...');
              const event = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                view: window
              });
              mark.dispatchEvent(event);
            } else {
              console.error('No mark found to click!');
            }
          };
          
          console.log('💡 Run robustClick() to test clicking');
        } else {
          console.error('❌ No marks visible!');
          console.log('Debug info:', {
            changes: storage.changeManager.getChanges(),
            diffMode: storage.isActive,
            cssLoaded: !!document.getElementById('diff-mark-styles')
          });
        }
      }, 200);
    } else {
      console.error('❌ Failed to add change');
    }
  }, 100);
}

// Start the test
console.log('🚀 Starting test...');
waitForEditor(runTest);

// Provide reset helper
window.robustReset = () => {
  if (window.editor) {
    const storage = window.editor.storage.diffV2;
    if (storage) {
      storage.changeManager.clear();
      if (storage.isActive) {
        window.editor.commands.toggleDiffMode();
      }
      console.log('✨ Reset complete');
    }
  }
};

console.log('\n💡 Helpers:');
console.log('- robustReset() - Clear everything');
console.log('- robustClick() - Click mark (available after test runs)'); 