// Test the fixed DiffMark implementation
console.log('🔧 Testing Fixed DiffMark Implementation\n');

const markFixV2 = {
  async init() {
    await this.waitForEditor();
    
    // Check if DiffExtension is loaded
    const diffExt = window.editor.extensionManager.extensions.find(ext => ext.name === 'diffV2');
    if (!diffExt) {
      console.error('❌ DiffExtensionV2 not found. Make sure it\'s loaded.');
      return;
    }
    
    console.log('✅ Editor ready');
    console.log('[DiffExtension] Diff mode:', window.editor.storage.diffV2?.isActive ? 'ON' : 'OFF');
    
    // Enable diff mode
    window.editor.commands.toggleDiffMode();
    
    // Test 1: Apply mark with proper attributes
    console.log('\n📝 Test 1: Testing fixed mark attributes');
    
    window.editor.chain()
      .setContent('<p>Test deletion here</p>')
      .setTextSelection({ from: 6, to: 14 }) // "deletion"
      .run();
    
    // Apply mark using the command
    const success = window.editor.commands.markDiff(6, 14, 'deletion', 'test-1', 'pending');
    console.log('Mark applied:', success);
    
    // Check the DOM
    setTimeout(() => {
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log('\n🔍 Marks in DOM:', marks.length);
      
      marks.forEach((mark, i) => {
        console.log(`Mark ${i + 1}:`, {
          type: mark.getAttribute('data-diff-type'),
          changeId: mark.getAttribute('data-change-id'),
          status: mark.getAttribute('data-status'),
          className: mark.className,
          style: mark.getAttribute('style'),
          text: mark.textContent
        });
      });
      
      // Test 2: Multiple mark types
      console.log('\n📝 Test 2: Testing all mark types');
      
      window.editor.chain()
        .setContent('<p>Addition text. Deletion text. Modification text.</p>')
        .run();
      
      // Apply different mark types
      window.editor.commands.markDiff(3, 11, 'addition', 'add-1', 'pending');
      window.editor.commands.markDiff(18, 26, 'deletion', 'del-1', 'pending');
      window.editor.commands.markDiff(33, 45, 'modification', 'mod-1', 'pending');
      
      setTimeout(() => {
        const allMarks = document.querySelectorAll('[data-diff-type]');
        console.log('\n🎨 All mark types:', allMarks.length);
        
        allMarks.forEach((mark) => {
          const type = mark.getAttribute('data-diff-type');
          const style = window.getComputedStyle(mark);
          console.log(`${type}:`, {
            backgroundColor: style.backgroundColor,
            borderBottom: style.borderBottom,
            textDecoration: style.textDecoration,
            text: mark.textContent
          });
        });
        
        // Visual check
        console.log('\n✅ Visual check - you should see:');
        console.log('- "Addition" with green highlight');
        console.log('- "Deletion" with red highlight and strikethrough');
        console.log('- "Modification" with cyan highlight');
        
      }, 100);
      
    }, 100);
  },
  
  async waitForEditor(maxAttempts = 50) {
    for (let i = 0; i < maxAttempts; i++) {
      if (window.editor && window.editor.state && window.editor.state.doc.content.size > 2) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Editor not found or not initialized');
  }
};

// Run the test
markFixV2.init().catch(console.error);

// Provide helper for manual testing
window.testMark = (type = 'deletion') => {
  const from = window.editor.state.selection.from;
  const to = window.editor.state.selection.to;
  
  if (from === to) {
    console.error('Please select some text first');
    return;
  }
  
  const success = window.editor.commands.markDiff(from, to, type, `manual-${Date.now()}`, 'pending');
  console.log(`Applied ${type} mark:`, success);
}; 