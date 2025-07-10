// Clean test for accept/reject functionality
console.log('✅ Testing Accept/Reject (Clean Version)\n');

(async function() {
  // Wait for editor
  let attempts = 0;
  while (!window.editor || window.editor.state.doc.content.size <= 2) {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (++attempts > 50) {
      console.error('❌ Editor not found');
      return;
    }
  }
  
  const editor = window.editor;
  const storage = editor.storage.diffV2;
  
  if (!storage) {
    console.error('❌ Diff extension not loaded');
    return;
  }
  
  console.log('✅ Editor ready\n');
  
  // Test 1: Single change accept
  console.log('📝 Test 1: Single change accept');
  
  // Enable diff mode and set content
  editor.commands.toggleDiffMode();
  editor.commands.setContent('<p>This text will be modified.</p>');
  
  // Find position of "text will be"
  let textPos = { from: -1, to: -1 };
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text.includes('text will be')) {
      const startIndex = node.text.indexOf('text will be');
      textPos.from = pos + startIndex;
      textPos.to = pos + startIndex + 'text will be'.length;
      return false;
    }
  });
  
  if (textPos.from === -1) {
    console.error('❌ Could not find text');
    return;
  }
  
  // Add change
  const change1 = {
    type: 'modification',
    position: textPos,
    originalText: 'text will be',
    suggestedText: 'content has been',
    metadata: { source: 'test1' }
  };
  
  editor.commands.addChange(change1);
  console.log('✅ Change added');
  
  // Get the change ID
  const changes = storage.changeManager.getChanges();
  if (changes.length === 0) {
    console.error('❌ No changes found');
    return;
  }
  
  const changeId = changes[0].id;
  console.log('Change ID:', changeId);
  
  // Wait a bit then accept
  setTimeout(() => {
    console.log('\n🎯 Accepting change...');
    
    try {
      const success = editor.commands.acceptChange(changeId);
      console.log('Accept result:', success);
      
      // Check the text
      const newText = editor.getText();
      console.log('New text:', newText);
      console.log('Expected: "This content has been modified."');
      console.log('Success:', newText.includes('content has been') ? '✅' : '❌');
      
    } catch (error) {
      console.error('Error during accept:', error.message);
    }
    
    // Test 2: Rejection after delay
    setTimeout(() => {
      console.log('\n\n📝 Test 2: Single change reject');
      runRejectTest();
    }, 1000);
    
  }, 1000);
  
  async function runRejectTest() {
    // Clear and reset
    editor.commands.setContent('<p>This text should stay the same.</p>');
    
    // Find position
    let textPos2 = { from: -1, to: -1 };
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text.includes('should stay')) {
        const startIndex = node.text.indexOf('should stay');
        textPos2.from = pos + startIndex;
        textPos2.to = pos + startIndex + 'should stay'.length;
        return false;
      }
    });
    
    // Add change
    const change2 = {
      type: 'modification',
      position: textPos2,
      originalText: 'should stay',
      suggestedText: 'will change',
      metadata: { source: 'test2' }
    };
    
    editor.commands.addChange(change2);
    
    // Get change ID
    const changes2 = storage.changeManager.getChanges();
    const changeId2 = changes2[0]?.id;
    
    if (!changeId2) {
      console.error('❌ No change found for reject test');
      return;
    }
    
    setTimeout(() => {
      console.log('🎯 Rejecting change...');
      
      try {
        const success = editor.commands.rejectChange(changeId2);
        console.log('Reject result:', success);
        
        // Check the text stayed the same
        const finalText = editor.getText();
        console.log('Final text:', finalText);
        console.log('Expected: "This text should stay the same."');
        console.log('Success:', finalText.includes('should stay') ? '✅' : '❌');
        
        console.log('\n✅ Tests complete!');
        
      } catch (error) {
        console.error('Error during reject:', error.message);
      }
    }, 1000);
  }
  
})();

// Helper functions for manual testing
window.quickAccept = () => {
  const changes = window.editor.storage.diffV2?.changeManager.getChanges();
  if (changes && changes.length > 0) {
    console.log('Accepting first change...');
    return window.editor.commands.acceptChange(changes[0].id);
  } else {
    console.log('No changes to accept');
    return false;
  }
};

window.quickReject = () => {
  const changes = window.editor.storage.diffV2?.changeManager.getChanges();
  if (changes && changes.length > 0) {
    console.log('Rejecting first change...');
    return window.editor.commands.rejectChange(changes[0].id);
  } else {
    console.log('No changes to reject');
    return false;
  }
}; 