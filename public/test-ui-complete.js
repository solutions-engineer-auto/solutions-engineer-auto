// Complete UI Test - Click Detection and Overlay Display
console.log('🎯 Testing Complete UI Connection\n');

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
  console.log('✅ Overlay manager exists:', !!storage.overlayManager);
  
  // Enable diff mode
  editor.commands.toggleDiffMode();
  console.log('✅ Diff mode enabled\n');
  
  // Set initial content
  editor.commands.setContent('<p>Click on the highlighted text to see the suggestion.</p>');
  
  // Find positions using doc traversal
  let highlightedPos = { from: -1, to: -1 };
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text.includes('highlighted')) {
      const index = node.text.indexOf('highlighted');
      highlightedPos.from = pos + index;
      highlightedPos.to = pos + index + 'highlighted'.length;
      return false;
    }
  });
  
  if (highlightedPos.from === -1) {
    console.error('❌ Could not find text position');
    return;
  }
  
  // Add a modification change
  const change = {
    type: 'modification',
    originalText: 'highlighted',
    suggestedText: 'emphasized',
    position: highlightedPos,
    instruction: 'Make the text more formal'
  };
  
  console.log('📝 Adding change:', {
    type: change.type,
    from: change.position.from,
    to: change.position.to,
    original: change.originalText,
    suggested: change.suggestedText
  });
  
  const success = editor.commands.addChange(change);
  console.log('✅ Change added:', success);
  
  // Give it a moment to render
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Find the mark element
  const markElement = document.querySelector('.diff-mark[data-change-id]');
  
  if (!markElement) {
    console.error('❌ Mark element not found in DOM');
    console.log('Available marks:', document.querySelectorAll('.diff-mark'));
    console.log('DOM content:', editor.view.dom.innerHTML);
    return;
  }
  
  console.log('✅ Mark element found:', markElement);
  console.log('   Class:', markElement.className);
  console.log('   Change ID:', markElement.getAttribute('data-change-id'));
  console.log('   Text:', markElement.textContent);
  console.log('   Type:', markElement.getAttribute('data-diff-type'));
  
  // Instructions for manual testing
  console.log('\n📋 MANUAL TEST INSTRUCTIONS:');
  console.log('1. The word "highlighted" should be cyan (modification)');
  console.log('2. Click on "highlighted" to see the overlay');
  console.log('3. The overlay should show:');
  console.log('   - "Suggested Change" header');
  console.log('   - Red: "- highlighted"');
  console.log('   - Green: "+ emphasized"');
  console.log('   - Confirm/Decline buttons');
  console.log('4. Click Confirm to change to "emphasized"');
  console.log('5. Click Decline to keep "highlighted"');
  
  // Create helper for programmatic click
  window.testClick = () => {
    console.log('\n🖱️ Simulating click on mark...');
    const mark = document.querySelector('.diff-mark[data-change-id]');
    if (!mark) {
      console.error('No mark found');
      return;
    }
    
    const event = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
      view: window
    });
    
    mark.dispatchEvent(event);
    console.log('✅ Click dispatched');
    
    // Check for overlay after a moment
    setTimeout(() => {
      const overlay = document.querySelector('.diff-overlay');
      if (overlay) {
        console.log('✅ Overlay appeared!');
        console.log('   Position:', overlay.style.top, overlay.style.left);
        console.log('   Content:', overlay.textContent);
      } else {
        console.error('❌ No overlay found');
      }
    }, 100);
  };
  
  console.log('\n💡 TIP: Run testClick() to simulate a click programmatically');
})(); 