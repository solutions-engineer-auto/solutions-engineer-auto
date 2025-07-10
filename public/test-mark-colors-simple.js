// Simple test for mark colors after fix
console.log('🎨 Testing Mark Colors\n');

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
  console.log('✅ Editor ready');
  
  // Check if diff extension is loaded
  const hasDiff = !!editor.storage.diffV2;
  console.log('Diff extension loaded:', hasDiff);
  
  if (!hasDiff) {
    console.error('❌ Diff extension not loaded');
    return;
  }
  
  // Enable diff mode
  console.log('\n🔄 Enabling diff mode...');
  editor.commands.toggleDiffMode();
  
  // Add test content
  editor.commands.setContent('<p>Test addition text. Test deletion text. Test modification text.</p>');
  
  // Apply different mark types
  console.log('\n📝 Applying marks...');
  
  // Addition (green)
  editor.commands.markDiff(3, 17, 'addition', 'test-add', 'pending');
  
  // Deletion (red with strikethrough)
  editor.commands.markDiff(24, 38, 'deletion', 'test-del', 'pending');
  
  // Modification (cyan)
  editor.commands.markDiff(45, 63, 'modification', 'test-mod', 'pending');
  
  // Check results
  setTimeout(() => {
    const marks = document.querySelectorAll('[data-diff-type]');
    console.log('\n🔍 Marks found:', marks.length);
    
    marks.forEach((mark) => {
      const type = mark.getAttribute('data-diff-type');
      const style = window.getComputedStyle(mark);
      console.log(`\n${type.toUpperCase()}:`);
      console.log('- Text:', mark.textContent);
      console.log('- Background:', style.backgroundColor);
      console.log('- Border:', style.borderBottom);
      console.log('- Text decoration:', style.textDecoration);
    });
    
    console.log('\n✅ You should see:');
    console.log('- "addition text" with GREEN highlight');
    console.log('- "deletion text" with RED highlight and strikethrough');
    console.log('- "modification text" with CYAN highlight');
    
  }, 100);
  
})();

// Helper for manual testing
window.quickTest = () => {
  const sel = window.editor.state.selection;
  if (sel.from === sel.to) {
    console.log('Select some text first!');
    return;
  }
  
  // Cycle through types
  const types = ['addition', 'deletion', 'modification'];
  const type = types[Math.floor(Math.random() * types.length)];
  
  window.editor.commands.markDiff(
    sel.from, 
    sel.to, 
    type, 
    `quick-${Date.now()}`, 
    'pending'
  );
  
  console.log(`Applied ${type} mark to selection`);
}; 