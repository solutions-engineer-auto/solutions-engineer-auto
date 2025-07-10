// Test script to verify current state of Phase 2 diff system
console.log('=== Phase 2 Current State Test ===');

// Wait for editor to be ready
const checkReady = setInterval(() => {
  if (typeof window.editor === 'undefined') {
    console.log('⏳ Waiting for editor...');
    return;
  }
  
  const editor = window.editor;
  if (!editor || !editor.state || editor.state.doc.content.size <= 2) {
    console.log('⏳ Waiting for document content...');
    return;
  }
  
  clearInterval(checkReady);
  
  console.log('✅ Editor ready');
  console.log('📄 Document size:', editor.state.doc.content.size);
  
  // Check if DiffExtension is loaded
  const hasDiffExtension = editor.extensionManager.extensions.some(ext => 
    ext.name === 'diffV2' || ext.name === 'diff'
  );
  console.log('🔌 DiffExtension loaded:', hasDiffExtension);
  
  if (!hasDiffExtension) {
    console.error('❌ DiffExtension not found! Make sure feature flag is enabled.');
    console.log('💡 Enable with: localStorage.setItem("DIFF_ENABLED", "true")');
    return;
  }
  
  // Check extension storage
  const diffStorage = editor.storage.diffV2 || editor.storage.diff;
  console.log('📦 Diff storage available:', !!diffStorage);
  
  if (diffStorage) {
    console.log('📋 Storage contents:', {
      hasChangeManager: !!diffStorage.changeManager,
      hasOverlayManager: !!diffStorage.overlayManager,
      isActive: diffStorage.isActive,
      hasGetEditor: !!diffStorage.getEditor
    });
  }
  
  // Check if commands are available
  const commands = [
    'toggleDiffMode',
    'addChange', 
    'acceptChange',
    'rejectChange',
    'markDiff',
    'unmarkDiff'
  ];
  
  console.log('🛠️ Available commands:');
  commands.forEach(cmd => {
    const hasCommand = typeof editor.commands[cmd] === 'function';
    console.log(`  - ${cmd}: ${hasCommand ? '✅' : '❌'}`);
  });
  
  // Check if CSS is loaded
  const hasCSS = !!document.getElementById('diff-mark-styles');
  console.log('🎨 CSS styles loaded:', hasCSS);
  
  // Test basic functionality
  console.log('\n=== Testing Basic Functionality ===');
  
  try {
    // Enable diff mode
    console.log('1️⃣ Enabling diff mode...');
    const toggleResult = editor.commands.toggleDiffMode();
    console.log('   Result:', toggleResult);
    console.log('   Is active:', diffStorage?.isActive);
    
    // Try to add a change
    console.log('\n2️⃣ Adding test change...');
    const change = {
      type: 'modification',
      originalText: 'test',
      suggestedText: 'modified test',
      position: { from: 1, to: 5 }
    };
    
    const addResult = editor.commands.addChange(change);
    console.log('   Result:', addResult);
    
    // Check if mark was applied
    setTimeout(() => {
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log('\n3️⃣ Checking for marks in DOM:');
      console.log('   Found marks:', marks.length);
      marks.forEach((mark, i) => {
        console.log(`   Mark ${i + 1}:`, {
          type: mark.getAttribute('data-diff-type'),
          changeId: mark.getAttribute('data-change-id'),
          text: mark.textContent
        });
      });
      
      // Check visual appearance
      if (marks.length > 0) {
        const firstMark = marks[0];
        const styles = window.getComputedStyle(firstMark);
        console.log('\n4️⃣ Visual check:');
        console.log('   Background:', styles.backgroundColor);
        console.log('   Border:', styles.borderBottom);
        console.log('   Display:', styles.display);
      }
      
      console.log('\n=== Test Complete ===');
      console.log('💡 Click on any highlighted text to see overlay');
      console.log('💡 Press Cmd/Ctrl+D to toggle diff mode');
      console.log('💡 Press Cmd/Ctrl+K to request AI edit (with text selected)');
    }, 100);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
}, 100); 