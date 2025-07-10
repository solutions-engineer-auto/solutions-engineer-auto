// Test overlay functionality with CORRECT positions
console.log('🖱️ Testing Mark Click Interaction (Fixed)\n');

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
  
  console.log('✅ Editor ready');
  console.log('Overlay manager exists:', !!storage.overlayManager);
  
  // Enable diff mode and add content
  editor.commands.toggleDiffMode();
  editor.commands.setContent('<p>Click on this highlighted text to see what happens.</p>');
  
  // Find the actual positions using ProseMirror's descendant method
  let targetFrom = -1;
  let targetTo = -1;
  
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text.includes('highlighted text')) {
      const startIndex = node.text.indexOf('highlighted text');
      targetFrom = pos + startIndex;
      targetTo = pos + startIndex + 'highlighted text'.length;
      return false; // Stop searching
    }
  });
  
  if (targetFrom === -1) {
    console.error('❌ Could not find target text');
    return;
  }
  
  console.log('🎯 Found text at positions:', { from: targetFrom, to: targetTo });
  
  // Add a test change with mark
  const change = {
    type: 'modification',
    position: { from: targetFrom, to: targetTo },
    originalText: 'highlighted text',
    suggestedText: 'MODIFIED TEXT',
    metadata: { source: 'test' }
  };
  
  const success = editor.commands.addChange(change);
  console.log('Change added:', success);
  
  // Wait for mark to render
  setTimeout(() => {
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log('\n📍 Marks found:', marks.length);
    
    if (marks.length > 0) {
      const firstMark = marks[0];
      console.log('Mark details:', {
        type: firstMark.getAttribute('data-diff-type'),
        changeId: firstMark.getAttribute('data-change-id'),
        text: firstMark.textContent
      });
      
      console.log('\n💡 Try clicking on the cyan highlighted text!');
      console.log('Expected: Overlay should appear with accept/reject buttons');
      
      // Simulate a click after a short delay
      setTimeout(() => {
        console.log('\n🖱️ Simulating click on mark...');
        const event = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
          view: window
        });
        firstMark.dispatchEvent(event);
      }, 1000);
    }
  }, 100);
  
})();

// Helper to get current changes
window.getChanges = () => {
  const storage = window.editor.storage.diffV2;
  if (!storage || !storage.changeManager) {
    console.error('No change manager found');
    return;
  }
  
  const changes = storage.changeManager.getChanges();
  console.table(changes.map(c => ({
    id: c.id,
    type: c.type,
    from: c.position.from,
    to: c.position.to,
    text: c.originalText,
    status: c.status
  })));
  
  return changes;
};

// Helper to manually accept/reject
window.acceptChange = (changeId) => {
  const changes = window.getChanges();
  if (!changeId && changes.length > 0) {
    changeId = changes[0].id;
  }
  
  console.log('Accepting change:', changeId);
  return window.editor.commands.acceptChange(changeId);
};

window.rejectChange = (changeId) => {
  const changes = window.getChanges();
  if (!changeId && changes.length > 0) {
    changeId = changes[0].id;
  }
  
  console.log('Rejecting change:', changeId);
  return window.editor.commands.rejectChange(changeId);
}; 