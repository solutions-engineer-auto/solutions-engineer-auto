/**
 * Fixed GitHub/Cursor Style Diff Test
 * Properly handles ProseMirror document positions
 */

console.log('🐙 Fixed GitHub Style Diff Test');
console.log('================================');

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

async function runFixedGitHubTest() {
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
    
    // CRITICAL: Get the actual document text and structure
    const doc = editor.state.doc;
    const docText = doc.textContent;
    console.log('\n📄 Document info:');
    console.log('- Doc size:', doc.content.size);
    console.log('- Text content:', docText);
    console.log('- Text length:', docText.length);
    
    // Helper to find text position in ProseMirror document
    function findTextPosition(searchText) {
      let result = null;
      
      doc.descendants((node, pos) => {
        if (node.isText && node.text.includes(searchText)) {
          const index = node.text.indexOf(searchText);
          result = {
            from: pos + index,
            to: pos + index + searchText.length
          };
          return false; // Stop searching
        }
      });
      
      return result;
    }
    
    // Enable diff mode
    editor.commands.toggleDiffMode();
    console.log('✅ Diff mode enabled');
    
    // Create test changes with proper positions
    console.log('\n🎯 Creating test changes with correct positions...');
    
    // Find actual positions
    const quickPos = findTextPosition('quick');
    const brownPos = findTextPosition('brown');
    const lazyPos = findTextPosition('lazy');
    
    console.log('\n📍 Found positions:');
    console.log('- "quick":', quickPos);
    console.log('- "brown":', brownPos);
    console.log('- "lazy":', lazyPos);
    
    if (!quickPos || !brownPos || !lazyPos) {
      throw new Error('Could not find all text positions');
    }
    
    // Create changes with correct positions
    const changes = [
      {
        type: 'modification',
        originalText: 'quick',
        suggestedText: 'fast',
        position: quickPos
      },
      {
        type: 'deletion',
        originalText: 'brown',
        suggestedText: '',
        position: brownPos
      },
      {
        type: 'modification',
        originalText: 'lazy',
        suggestedText: 'sleeping',
        position: lazyPos
      }
    ];
    
    // Add changes one by one
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      console.log(`\n[${i + 1}/${changes.length}] Adding ${change.type}:`, {
        text: change.originalText,
        position: change.position
      });
      
      try {
        const success = editor.commands.addChange(change);
        console.log(success ? '✅ Success' : '❌ Failed');
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error('❌ Error adding change:', err.message);
      }
    }
    
    // Check what we created
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log(`\n📊 Created ${marks.length} marks`);
    
    marks.forEach((mark, i) => {
      console.log(`\nMark ${i + 1}:`, {
        type: mark.dataset.diffType,
        text: mark.textContent,
        className: mark.className
      });
    });
    
    // Test accept/reject if marks were created
    if (marks.length > 0) {
      console.log('\n🧪 Testing Accept/Reject...');
      
      // Test accepting first mark
      const firstMark = marks[0];
      console.log('\n1️⃣ Testing ACCEPT on:', firstMark.dataset.diffType, firstMark.textContent);
      
      firstMark.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const acceptBtn = document.querySelector('.diff-accept');
      if (acceptBtn) {
        console.log('Before accept:', editor.state.doc.textContent);
        
        acceptBtn.dispatchEvent(new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window
        }));
        
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('After accept:', editor.state.doc.textContent);
      }
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
runFixedGitHubTest();

// Better helper functions
window.fixedGitHub = {
  // Debug document structure
  debugDoc: () => {
    const editor = window.editor;
    if (!editor) return;
    
    console.log('Document structure:');
    editor.state.doc.descendants((node, pos) => {
      console.log(`Pos ${pos}:`, node.type.name, node.textContent ? `"${node.textContent}"` : '');
    });
  },
  
  // Create change at specific word
  createChangeForWord: (word, type = 'modification') => {
    const editor = window.editor;
    if (!editor) return;
    
    let position = null;
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text.includes(word)) {
        const index = node.text.indexOf(word);
        position = {
          from: pos + index,
          to: pos + index + word.length
        };
        return false;
      }
    });
    
    if (position) {
      const change = {
        type,
        originalText: word,
        suggestedText: type === 'deletion' ? '' : word.toUpperCase(),
        position
      };
      
      editor.commands.addChange(change);
      console.log(`✅ Created ${type} for "${word}" at positions ${position.from}-${position.to}`);
    } else {
      console.log(`❌ Could not find "${word}" in document`);
    }
  },
  
  // Show document positions
  showPositions: () => {
    const editor = window.editor;
    if (!editor) return;
    
    const text = editor.state.doc.textContent;
    console.log('Text:', text);
    console.log('Doc size:', editor.state.doc.content.size);
    
    // Show position of each character
    let output = '';
    for (let i = 0; i < Math.min(30, text.length); i++) {
      output += `${i}:${text[i]} `;
    }
    console.log('Positions:', output);
  }
};

console.log('\n💡 Fixed helpers:');
console.log('- fixedGitHub.debugDoc() - Show document structure');
console.log('- fixedGitHub.createChangeForWord("word") - Create change with correct positions');
console.log('- fixedGitHub.showPositions() - Show character positions'); 