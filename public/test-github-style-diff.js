/**
 * GitHub/Cursor Style Diff Test
 * Demonstrates proper accept/reject behavior
 */

console.log('🐙 GitHub/Cursor Style Diff Test');
console.log('=================================');

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

async function runGitHubStyleTest() {
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
    
    // Set up test content
    const testContent = 'The quick brown fox jumps over the lazy dog. This is a test sentence.';
    editor.commands.setContent(`<p>${testContent}</p>`);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('\n📝 Original content:', testContent);
    
    // Enable diff mode
    editor.commands.toggleDiffMode();
    console.log('✅ Diff mode enabled');
    
    // Create test changes
    console.log('\n🎯 Creating test changes...');
    
    // Change 1: Modification (quick -> fast)
    const change1 = {
      type: 'modification',
      originalText: 'quick',
      suggestedText: 'fast',
      position: { from: 4, to: 9 }  // "quick"
    };
    
    // Change 2: Deletion (remove "brown")
    const change2 = {
      type: 'deletion',
      originalText: 'brown ',
      suggestedText: '',
      position: { from: 10, to: 16 }  // "brown "
    };
    
    // Change 3: Modification (lazy -> sleeping)
    const change3 = {
      type: 'modification',
      originalText: 'lazy',
      suggestedText: 'sleeping',
      position: { from: 35, to: 39 }  // "lazy"
    };
    
    // Add changes
    const changes = [change1, change2, change3];
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      console.log(`\nAdding ${change.type}:`, {
        original: change.originalText || '[none]',
        suggested: change.suggestedText || '[delete]',
        position: change.position
      });
      
      editor.commands.addChange(change);
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Check marks
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log(`\n✅ Created ${marks.length} highlights`);
    
    // Demo accept/reject
    console.log('\n🧪 Testing Accept/Reject Behavior:');
    console.log('=====================================');
    
    // Test 1: Accept a modification
    console.log('\n1️⃣ ACCEPT modification (quick → fast)');
    console.log('Before:', editor.state.doc.textContent);
    
    if (marks[0]) {
      // Click the first mark
      marks[0].dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Find and click accept button
      const acceptBtn = document.querySelector('.diff-accept');
      if (acceptBtn) {
        acceptBtn.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('After:', editor.state.doc.textContent);
        console.log('✅ Text changed from "quick" to "fast"');
      }
    }
    
    // Test 2: Reject a deletion
    console.log('\n2️⃣ REJECT deletion (restore "brown")');
    console.log('Before:', editor.state.doc.textContent);
    
    // Re-query marks after changes
    const marksAfterAccept = document.querySelectorAll('[data-diff-type]');
    const deletionMark = Array.from(marksAfterAccept).find(m => m.dataset.diffType === 'deletion');
    
    if (deletionMark) {
      // Click the deletion mark
      deletionMark.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Find and click reject button
      const rejectBtn = document.querySelector('.diff-reject');
      if (rejectBtn) {
        rejectBtn.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('After:', editor.state.doc.textContent);
        console.log('✅ Deleted text "brown" was restored!');
      }
    }
    
    console.log('\n📊 Final Summary:');
    console.log('- ACCEPT keeps suggested changes');
    console.log('- REJECT reverts to original text');
    console.log('- Just like GitHub pull request diffs! 🎉');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
runGitHubStyleTest();

// Helper functions for manual testing
window.githubTest = {
  // Create a deletion change
  createDeletion: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const text = editor.state.doc.textContent;
    const word = text.match(/\b\w{4,}\b/);
    
    if (word) {
      const pos = text.indexOf(word[0]);
      editor.commands.addChange({
        type: 'deletion',
        originalText: word[0],
        suggestedText: '',
        position: { from: pos, to: pos + word[0].length }
      });
      console.log(`✅ Created deletion for "${word[0]}"`);
      console.log('Click it and reject to restore the text!');
    }
  },
  
  // Create a modification change
  createModification: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const text = editor.state.doc.textContent;
    const word = text.match(/\b\w{5,}\b/);
    
    if (word) {
      const pos = text.indexOf(word[0]);
      editor.commands.addChange({
        type: 'modification',
        originalText: word[0],
        suggestedText: word[0].toUpperCase(),
        position: { from: pos, to: pos + word[0].length }
      });
      console.log(`✅ Created modification: "${word[0]}" → "${word[0].toUpperCase()}"`);
      console.log('Accept to keep uppercase, reject to keep original!');
    }
  },
  
  // Show current changes
  showChanges: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const storage = editor.storage.diffV2;
    const changes = storage.changeManager.getChanges();
    
    console.log('\n📋 Current Changes:');
    changes.forEach((change, i) => {
      console.log(`${i + 1}. ${change.type}:`, {
        original: change.originalText || '[none]',
        suggested: change.suggestedText || '[delete]',
        status: change.status
      });
    });
  }
};

console.log('\n💡 Manual test helpers:');
console.log('- githubTest.createDeletion() - Create a deletion to test reject');
console.log('- githubTest.createModification() - Create a modification');
console.log('- githubTest.showChanges() - Show all current changes'); 