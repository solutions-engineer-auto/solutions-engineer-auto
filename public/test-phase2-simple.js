/**
 * Simple Phase 2 Test - Basic functionality test
 */

console.log('🧪 Simple Phase 2 Test');
console.log('====================');

// Helper to wait for editor
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

// Helper to wait for element
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const check = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(check);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(check);
        reject(new Error(`Element ${selector} not found within ${timeout}ms`));
      }
    }, 100);
  });
}

// Main test
async function runTest() {
  try {
    console.log('⏳ Waiting for editor...');
    const editor = await waitForEditor();
    console.log('✅ Editor ready');
    
    const storage = editor.storage.diffV2;
    if (!storage) {
      throw new Error('Diff extension not loaded');
    }
    
    // Clear any existing state and ensure clean start
    storage.changeManager.clear();
    
    // Disable then enable diff mode to ensure clean state
    if (storage.isActive) {
      editor.commands.toggleDiffMode();  // Turn off
    }
    
    console.log('\n1️⃣ Enabling diff mode...');
    editor.commands.toggleDiffMode();  // Turn on
    console.log('✅ Diff mode enabled');
    
    // Add a simple change
    console.log('\n2️⃣ Adding test change...');
    const change = {
      type: 'modification',
      originalText: 'TEMPLATE:',
      suggestedText: 'UPDATED TEXT:',
      position: { from: 0, to: 10 }  // 0-indexed positions
    };
    
    const success = editor.commands.addChange(change);
    if (!success) {
      throw new Error('Failed to add change');
    }
    console.log('✅ Change added');
    
    // Wait for mark to appear
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check for marks
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log(`\n3️⃣ Found ${marks.length} mark(s)`);
    
    if (marks.length === 0) {
      throw new Error('No marks found in DOM');
    }
    
    const mark = marks[0];
    console.log('✅ Mark details:', {
      type: mark.dataset.diffType,
      changeId: mark.dataset.changeId,
      text: mark.textContent
    });
    
    // Simulate click to show overlay
    console.log('\n4️⃣ Clicking mark to show overlay...');
    const clickEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    mark.dispatchEvent(clickEvent);
    
    // Wait for overlay
    await waitForElement('.diff-overlay', 2000);
    console.log('✅ Overlay appeared!');
    
    // Test accept functionality
    console.log('\n5️⃣ Testing accept button...');
    
    // Store original content
    const originalContent = editor.state.doc.textContent;
    console.log('Original content:', originalContent);
    
    // Click accept
    const acceptBtn = document.querySelector('.diff-accept');
    if (!acceptBtn) {
      throw new Error('Accept button not found');
    }
    
    const acceptEvent = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    acceptBtn.dispatchEvent(acceptEvent);
    
    // Wait for change to apply
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Check if content changed
    const newContent = editor.state.doc.textContent;
    console.log('New content:', newContent);
    
    if (newContent.includes('UPDATED TEXT:')) {
      console.log('✅ Change applied successfully!');
    } else {
      console.log('❌ Change was not applied');
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
runTest();

// Helper functions for manual testing
window.simpleTest = {
  reset: () => {
    if (window.editor) {
      const storage = window.editor.storage.diffV2;
      if (storage) {
        storage.changeManager.clear();
        window.editor.commands.toggleDiffMode();
        window.editor.commands.toggleDiffMode();
        console.log('✨ Reset complete');
      }
    }
  },
  
  addChange: () => {
    if (window.editor) {
      window.editor.commands.addChange({
        type: 'modification',
        originalText: 'TEMPLATE:',
        suggestedText: 'NEW TEXT:',
        position: { from: 0, to: 10 }  // 0-indexed
      });
      console.log('✅ Change added');
    }
  },
  
  clickMark: () => {
    const mark = document.querySelector('[data-diff-type]');
    if (mark) {
      mark.dispatchEvent(new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        view: window
      }));
      console.log('✅ Mark clicked');
    }
  }
};

console.log('\n💡 Manual helpers available:');
console.log('- simpleTest.reset()');
console.log('- simpleTest.addChange()');
console.log('- simpleTest.clickMark()'); 