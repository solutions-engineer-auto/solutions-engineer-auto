/**
 * Test script for verifying position tracking fix
 * 
 * This test demonstrates that marks now correctly track their positions
 * even when text is added before them in the document.
 * 
 * TO RUN: 
 * 1. Open the document editor
 * 2. In console: const script = document.createElement('script'); script.src = '/test-position-tracking-fix.js'; document.body.appendChild(script);
 * 
 * CLEANUP: testPositionFix.cleanup()
 */

(function() {
  const editor = window.editor;
  if (!editor) {
    console.error('❌ No editor found. Make sure you\'re on the document editor page.');
    return;
  }

  console.log('🧪 POSITION TRACKING FIX TEST');
  console.log('=============================');
  
  // Test functions
  const testPositionFix = {
    // Main test function
    async runTest() {
      console.log('\n📝 Step 1: Setting up test document...');
      
      // Clear document and set initial content
      editor.commands.setContent('<p>The quick brown fox jumps over the lazy dog.</p>');
      
      // Enable diff mode
      editor.commands.toggleDiffMode();
      console.log('✅ Diff mode enabled');
      
      // Calculate position for "brown fox" using ProseMirror positions
      // <p> = position 0-1, then text starts at position 1
      const searchText = 'brown fox';
      const textContent = editor.state.doc.textContent;
      const textIndex = textContent.indexOf(searchText);
      
      if (textIndex === -1) {
        console.error('❌ Could not find test text');
        return;
      }
      
      // Account for paragraph node (+1)
      const from = textIndex + 1;
      const to = from + searchText.length;
      
      console.log('\n📍 Step 2: Adding a change at specific position...');
      console.log(`Text: "${searchText}"`);
      console.log(`Position: ${from}-${to}`);
      
      // Add a modification change
      const changeAdded = editor.commands.addChange({
        type: 'modification',
        position: { from, to },
        originalText: searchText,
        suggestedText: 'red wolf',
        metadata: {
          testCase: 'position-tracking-fix'
        }
      });
      
      if (!changeAdded) {
        console.error('❌ Failed to add change');
        return;
      }
      
      // Get the change ID
      const changes = editor.storage.diffV2.changeManager.getChanges();
      const testChange = changes.find(c => c.metadata && c.metadata.testCase === 'position-tracking-fix');
      
      if (!testChange) {
        console.error('❌ Could not find test change');
        return;
      }
      
      console.log('✅ Change added:', {
        changeId: testChange.id,
        originalPosition: testChange.position,
        markedText: testChange.originalText
      });
      
      // Wait for UI to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('\n🔄 Step 3: Adding text BEFORE the mark...');
      
      // Insert text at the beginning of the document
      editor.chain()
        .focus()
        .setTextSelection(1) // After <p>
        .insertContent('INSERTED TEXT HERE. ')
        .run();
      
      console.log('✅ Text inserted at beginning');
      console.log('📊 New document:', editor.state.doc.textContent);
      
      // Wait for position updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('\n🎯 Step 4: Testing accept with moved mark...');
      console.log('The mark should have moved. Watch the console for drift detection...');
      
      // Find the mark element and click it
      const markElement = editor.view.dom.querySelector(`[data-change-id="${testChange.id}"]`);
      
      if (!markElement) {
        console.error('❌ Could not find mark element');
        return;
      }
      
      console.log('✅ Found mark element, triggering click...');
      
      // Simulate click to show overlay
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      });
      markElement.dispatchEvent(clickEvent);
      
      console.log('\n💡 INSTRUCTIONS:');
      console.log('1. You should see the overlay appear');
      console.log('2. Check console for "POSITION DRIFT DETECTED" message');
      console.log('3. Click "Confirm" to accept the change');
      console.log('4. The correct text should be replaced (not the wrong position!)');
      console.log('\n📋 Expected: "brown fox" → "red wolf" (not at the original position)');
      
      // Store test data for manual verification
      window.testPositionFix = this;
      this.testChange = testChange;
      this.markElement = markElement;
    },
    
    // Helper to manually accept the change
    acceptTestChange() {
      if (!this.testChange) {
        console.error('No test change found. Run the test first.');
        return;
      }
      
      console.log('\n🔥 Manually accepting change...');
      const result = editor.commands.acceptChange(this.testChange.id);
      
      if (result) {
        console.log('✅ Change accepted successfully!');
        console.log('📊 Final document:', editor.state.doc.textContent);
        console.log('\n✨ TEST COMPLETE - Check if "brown fox" was replaced with "red wolf"');
      } else {
        console.error('❌ Failed to accept change');
      }
    },
    
    // Helper to show current marks
    showMarks() {
      console.log('\n📍 Current marks in document:');
      const marks = [];
      
      editor.state.doc.descendants((node, pos) => {
        if (node.isText && node.marks.length > 0) {
          node.marks.forEach(mark => {
            if (mark.type.name === 'diffMark') {
              marks.push({
                from: pos,
                to: pos + node.nodeSize,
                changeId: mark.attrs.changeId,
                type: mark.attrs.type,
                text: node.text
              });
            }
          });
        }
      });
      
      console.table(marks);
      return marks;
    },
    
    // Cleanup function
    cleanup() {
      console.log('\n🧹 Cleaning up test...');
      
      // Clear all changes
      if (editor.storage.diffV2) {
        editor.storage.diffV2.changeManager.clear();
      }
      
      // Disable diff mode
      editor.commands.toggleDiffMode();
      
      // Clear content
      editor.commands.setContent('');
      
      console.log('✅ Cleanup complete');
    }
  };
  
  // Run the test
  testPositionFix.runTest();
  
  // Make available globally
  window.testPositionFix = testPositionFix;
  
  console.log('\n📌 Test helpers available:');
  console.log('- testPositionFix.acceptTestChange() - Manually accept the change');
  console.log('- testPositionFix.showMarks() - Show all marks in document');
  console.log('- testPositionFix.cleanup() - Clean up after test');
})(); 