/**
 * Test script for Phase 2 Diff Integration
 * Run this in the browser console while on the document editor page
 */

console.log('🧪 Phase 2 Diff Integration Test Script');

// Helper to get the editor instance
function getEditor() {
  // Try to find the editor from React DevTools or global
  const editor = window.__tiptap_editor || 
    document.querySelector('.ProseMirror')?.__tiptapEditor ||
    window.editor;
    
  if (!editor) {
    console.error('❌ Could not find TipTap editor instance');
    console.log('Try setting window.editor = editor in your React component');
    return null;
  }
  
  return editor;
}

// Helper to ensure document has content [[memory:2768147]]
function ensureDocumentHasContent(editor) {
  const docSize = editor.state.doc.content.size;
  console.log(`Document size: ${docSize}`);
  
  // A document size of 2 means empty (doc node + empty paragraph)
  if (docSize <= 2) {
    console.log('📝 Document is empty, adding test content...');
    editor.commands.setContent(`
      <h1>Test Document for Diff System</h1>
      <p>This is a paragraph that we will use to test the diff system. It contains enough text to make meaningful selections.</p>
      <p>Here is another paragraph with more content. We can select parts of this text and apply different types of changes to see how the system handles them.</p>
      <p>The diff system should highlight additions in green, deletions in red, and modifications in cyan. Clicking on any highlighted text should show accept/reject buttons.</p>
    `);
    return true;
  }
  return false;
}

// Test 1: Basic diff mode toggle
function testDiffToggle() {
  console.log('\n📋 Test 1: Diff Mode Toggle');
  const editor = getEditor();
  if (!editor) return;
  
  try {
    // Check if diff extension is loaded
    const hasDiffExtension = editor.extensionManager.extensions.some(ext => 
      ext.name === 'diffV2' || ext.name === 'diff'
    );
    
    if (!hasDiffExtension) {
      console.error('❌ Diff extension not found in editor');
      console.log('Make sure DIFF_ENABLED is true in featureFlags.js');
      return;
    }
    
    // Check CSS injection
    const cssInjected = document.getElementById('diff-mark-styles');
    console.log('CSS styles injected:', !!cssInjected);
    
    // Toggle diff mode
    console.log('Toggling diff mode...');
    editor.commands.toggleDiffMode();
    
    console.log('✅ Diff mode toggled successfully');
    console.log('Storage state:', editor.storage.diffV2);
    console.log('Is active:', editor.storage.diffV2?.isActive);
  } catch (error) {
    console.error('❌ Error toggling diff mode:', error);
  }
}

// Test 2: Add a simple change
function testAddChange() {
  console.log('\n📋 Test 2: Add Change');
  const editor = getEditor();
  if (!editor) return;
  
  try {
    // Ensure content exists
    ensureDocumentHasContent(editor);
    
    // Get current selection or use a default range
    const { from, to } = editor.state.selection;
    const docSize = editor.state.doc.content.size;
    
    let changeFrom = from;
    let changeTo = to;
    
    if (from === to || from < 1 || to > docSize) {
      console.log('No valid selection, selecting first 10 characters after heading...');
      // Find first paragraph content
      let firstParaStart = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && node.textContent.length > 10) {
          firstParaStart = pos + 1; // +1 to get inside the paragraph
          return false; // stop iteration
        }
      });
      
      if (firstParaStart > 0) {
        changeFrom = firstParaStart;
        changeTo = Math.min(firstParaStart + 10, docSize - 1);
        editor.commands.setTextSelection({ from: changeFrom, to: changeTo });
      } else {
        console.error('Could not find suitable text to select');
        return;
      }
    }
    
    const selectedText = editor.state.doc.textBetween(changeFrom, changeTo);
    console.log(`Selected text: "${selectedText}" at positions ${changeFrom}-${changeTo}`);
    
    // Create a test change
    const change = {
      id: `test-${Date.now()}`,
      type: 'modification',
      position: { from: changeFrom, to: changeTo },
      originalText: selectedText,
      suggestedText: 'Modified text by AI',
      status: 'pending'
    };
    
    console.log('Adding change:', change);
    const success = editor.commands.addChange(change);
    
    if (success) {
      console.log('✅ Change added successfully');
      // Wait a bit then check for marks
      setTimeout(() => {
        const marks = document.querySelectorAll('[data-diff-type]');
        console.log(`Found ${marks.length} diff marks in DOM`);
        if (marks.length > 0) {
          console.log('✅ Marks are visible!');
          marks.forEach((mark, i) => {
            console.log(`  Mark ${i + 1}:`, {
              type: mark.getAttribute('data-diff-type'),
              changeId: mark.getAttribute('data-change-id'),
              text: mark.textContent
            });
          });
        } else {
          console.error('❌ No marks found in DOM - check console for [DiffExtension] logs');
        }
      }, 200);
    } else {
      console.log('❌ Failed to add change');
    }
  } catch (error) {
    console.error('❌ Error adding change:', error);
  }
}

// Test 3: Test mark rendering
function testMarkRendering() {
  console.log('\n📋 Test 3: Mark Rendering');
  const editor = getEditor();
  if (!editor) return;
  
  try {
    // Check if any diff marks exist
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log(`Found ${marks.length} diff marks in the document`);
    
    marks.forEach((mark, index) => {
      console.log(`Mark ${index + 1}:`, {
        type: mark.getAttribute('data-diff-type'),
        changeId: mark.getAttribute('data-change-id'),
        status: mark.getAttribute('data-status'),
        text: mark.textContent,
        classes: mark.className,
        styles: mark.getAttribute('style')
      });
    });
    
    if (marks.length === 0) {
      console.log('No diff marks found. Try adding a change first.');
      console.log('Also check if CSS styles are loaded:');
      const styles = document.getElementById('diff-mark-styles');
      console.log('diff-mark-styles element:', styles ? 'Found' : 'Not found');
    }
  } catch (error) {
    console.error('❌ Error checking marks:', error);
  }
}

// Test 4: Full flow test
async function testFullFlow() {
  console.log('\n📋 Test 4: Full Integration Flow');
  const editor = getEditor();
  if (!editor) return;
  
  try {
    // Step 0: Ensure content
    ensureDocumentHasContent(editor);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 1: Enable diff mode
    console.log('1️⃣ Enabling diff mode...');
    if (!editor.storage.diffV2?.isActive) {
      editor.commands.toggleDiffMode();
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Step 2: Find and select some text
    console.log('2️⃣ Selecting text...');
    let selectedStart = -1;
    let selectedEnd = -1;
    
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === 'paragraph' && node.textContent.includes('diff system')) {
        const start = node.textContent.indexOf('diff system');
        selectedStart = pos + 1 + start; // +1 for paragraph start
        selectedEnd = selectedStart + 11; // length of "diff system"
        return false;
      }
    });
    
    if (selectedStart > 0) {
      editor.commands.setTextSelection({ from: selectedStart, to: selectedEnd });
      const selectedText = editor.state.doc.textBetween(selectedStart, selectedEnd);
      console.log(`Selected text: "${selectedText}"`);
    } else {
      console.error('Could not find "diff system" text to select');
      return;
    }
    
    // Step 3: Add a change
    console.log('3️⃣ Adding AI change...');
    const change = {
      id: `ai-${Date.now()}`,
      type: 'modification',
      position: { from: selectedStart, to: selectedEnd },
      originalText: 'diff system',
      suggestedText: 'AI diff system',
      status: 'pending'
    };
    editor.commands.addChange(change);
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Step 4: Check if mark was applied
    console.log('4️⃣ Checking for diff marks...');
    const marks = document.querySelectorAll('[data-diff-type]');
    if (marks.length > 0) {
      console.log('✅ Diff mark applied successfully');
      console.log('Mark details:', marks[0]);
    } else {
      console.log('❌ No diff marks found');
      console.log('Checking storage for changes:', editor.storage.diffV2?.changeManager?.getChanges());
    }
    
    // Step 5: Try to click the mark (trigger overlay)
    console.log('5️⃣ Attempting to trigger overlay...');
    if (marks.length > 0) {
      marks[0].click();
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const overlay = document.querySelector('.diff-overlay');
      if (overlay) {
        console.log('✅ Overlay appeared');
      } else {
        console.log('❌ Overlay did not appear');
      }
    }
    
  } catch (error) {
    console.error('❌ Error in full flow test:', error);
  }
}

// Export test functions for easy access
window.diffTest = {
  toggle: testDiffToggle,
  addChange: testAddChange,
  checkMarks: testMarkRendering,
  fullFlow: testFullFlow,
  getEditor: getEditor,
  
  // Quick helpers
  enable: () => {
    const editor = getEditor();
    if (editor && !editor.storage.diffV2?.isActive) {
      editor.commands.toggleDiffMode();
      console.log('✅ Diff mode enabled');
    }
  },
  
  disable: () => {
    const editor = getEditor();
    if (editor && editor.storage.diffV2?.isActive) {
      editor.commands.toggleDiffMode();
      console.log('✅ Diff mode disabled');
    }
  },
  
  // Add test changes at different positions
  addTestChanges: () => {
    const editor = getEditor();
    if (!editor) return;
    
    // Ensure content first
    ensureDocumentHasContent(editor);
    
    // Wait a bit for content to be set
    setTimeout(() => {
      const docSize = editor.state.doc.content.size;
      console.log(`Document size: ${docSize}`);
      
      // Find safe positions in the document
      const positions = [];
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && node.textContent.length > 20) {
          positions.push({
            start: pos + 1,
            end: Math.min(pos + 11, pos + node.nodeSize - 1),
            text: node.textContent.substring(0, 10)
          });
        }
      });
      
      if (positions.length < 3) {
        console.error('Not enough content in document for test changes');
        return;
      }
      
      const changes = [
        { ...positions[0], type: 'addition', newText: 'ADDED: ' },
        { ...positions[1], type: 'deletion', newText: '' },
        { ...positions[2], type: 'modification', newText: 'MODIFIED TEXT' }
      ];
      
      changes.forEach((change, i) => {
        setTimeout(() => {
          const changeObj = {
            id: `test-${i}-${Date.now()}`,
            type: change.type,
            position: { from: change.start, to: change.end },
            originalText: editor.state.doc.textBetween(change.start, change.end),
            suggestedText: change.newText,
            status: 'pending'
          };
          editor.commands.addChange(changeObj);
          console.log(`Added ${change.type} change at ${change.start}-${change.end}`);
        }, i * 200);
      });
    }, 100);
  },
  
  // Accept/reject helpers
  acceptFirst: () => {
    const mark = document.querySelector('[data-change-id]');
    if (mark) {
      const changeId = mark.getAttribute('data-change-id');
      getEditor()?.commands.acceptChange(changeId);
      console.log(`✅ Accepted change ${changeId}`);
    } else {
      console.log('No changes to accept');
    }
  },
  
  rejectFirst: () => {
    const mark = document.querySelector('[data-change-id]');
    if (mark) {
      const changeId = mark.getAttribute('data-change-id');
      getEditor()?.commands.rejectChange(changeId);
      console.log(`✅ Rejected change ${changeId}`);
    } else {
      console.log('No changes to reject');
    }
  },
  
  // Debug helper
  debug: () => {
    const editor = getEditor();
    if (!editor) return;
    
    console.log('=== DIFF SYSTEM DEBUG INFO ===');
    console.log('Editor available:', !!editor);
    console.log('Diff extension loaded:', editor.extensionManager.extensions.some(ext => ext.name === 'diffV2'));
    console.log('Diff mode active:', editor.storage.diffV2?.isActive);
    console.log('Document size:', editor.state.doc.content.size);
    console.log('CSS styles loaded:', !!document.getElementById('diff-mark-styles'));
    console.log('Changes in storage:', editor.storage.diffV2?.changeManager?.getChanges());
    console.log('Marks in DOM:', document.querySelectorAll('[data-diff-type]').length);
    console.log('===============================');
  }
};

// Run initial test
console.log('\n🚀 Running initial diagnostics...');
testDiffToggle();
console.log('\n💡 Available commands:');
console.log('- diffTest.toggle()       - Toggle diff mode');
console.log('- diffTest.addChange()    - Add a test change');
console.log('- diffTest.checkMarks()   - Check for diff marks');
console.log('- diffTest.fullFlow()     - Run full integration test');
console.log('- diffTest.enable()       - Enable diff mode');
console.log('- diffTest.disable()      - Disable diff mode');
console.log('- diffTest.addTestChanges() - Add multiple test changes');
console.log('- diffTest.acceptFirst()  - Accept first change');
console.log('- diffTest.rejectFirst()  - Reject first change');
console.log('- diffTest.debug()        - Show debug information');

// Also expose editor for debugging
const editor = getEditor();
if (editor) {
  window.editor = editor;
  console.log('\n✅ Editor exposed as window.editor for debugging');
} 