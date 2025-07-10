// LLM Integration Demo - Hello → Bye
console.log('🤖 LLM Integration Demo\n');

// Helper function to find text in document
function findTextInDocument(editor, searchText) {
  let foundPos = { from: -1, to: -1 };
  
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text.includes(searchText)) {
      const index = node.text.indexOf(searchText);
      foundPos.from = pos + index;
      foundPos.to = pos + index + searchText.length;
      return false; // Stop searching
    }
  });
  
  return foundPos;
}

// Main demo
async function runLLMDemo() {
  const editor = window.editor;
  
  if (!editor) {
    console.error('❌ Editor not found');
    return;
  }
  
  // Enable diff mode
  editor.commands.toggleDiffMode();
  console.log('✅ Diff mode enabled');
  
  // Set initial content
  editor.commands.setContent('<p>hello world</p>');
  console.log('📝 Document: "hello world"');
  
  // Simulate LLM processing
  console.log('\n⏳ Simulating LLM processing...');
  
  setTimeout(() => {
    console.log('🤖 LLM suggests: Replace "hello" with "bye"');
    
    // Find "hello" in the document
    const position = findTextInDocument(editor, 'hello');
    
    if (position.from === -1) {
      console.error('❌ Could not find "hello" in document');
      return;
    }
    
    console.log('📍 Found "hello" at positions:', position);
    
    // Create the change (using modification type for replacement)
    const change = {
      type: 'modification',
      position: position,
      originalText: 'hello',
      suggestedText: 'bye',
      metadata: {
        source: 'llm',
        reason: 'User requested greeting change',
        confidence: 0.95
      }
    };
    
    // Apply the change
    const success = editor.commands.addChange(change);
    console.log('✅ Change applied:', success);
    
    console.log('\n💡 What you should see:');
    console.log('- "hello" is highlighted in CYAN (modification)');
    console.log('- Click on "hello" to see accept/reject buttons');
    console.log('- Accept → text becomes "bye world"');
    console.log('- Reject → text stays "hello world"');
    
    // Show how to check changes
    console.log('\n📊 Current changes:');
    const changes = editor.storage.diffV2?.changeManager.getChanges();
    if (changes && changes.length > 0) {
      changes.forEach(c => {
        console.log(`- ${c.originalText} → ${c.suggestedText} (${c.type})`);
      });
    }
    
  }, 2000);
}

// Run the demo
runLLMDemo();

// Provide helper for accepting the change
window.acceptLLMChange = () => {
  const changes = window.editor.storage.diffV2?.changeManager.getChanges();
  if (changes && changes.length > 0) {
    console.log('✅ Accepting LLM suggestion...');
    const success = window.editor.commands.acceptChange(changes[0].id);
    if (success) {
      console.log('Document now says:', window.editor.getText());
    }
    return success;
  }
  return false;
};

// Example of handling multiple LLM suggestions
window.demoMultipleChanges = () => {
  const editor = window.editor;
  
  // Reset content
  editor.commands.setContent('<p>The quick brown fox jumps over the lazy dog.</p>');
  
  // Simulate multiple LLM suggestions
  const llmSuggestions = [
    { original: 'quick', suggested: 'swift' },
    { original: 'brown', suggested: 'red' },
    { original: 'lazy', suggested: 'sleeping' }
  ];
  
  console.log('\n🤖 LLM suggests multiple changes:');
  llmSuggestions.forEach(s => console.log(`- "${s.original}" → "${s.suggested}"`));
  
  // Apply all suggestions
  llmSuggestions.forEach((suggestion, index) => {
    setTimeout(() => {
      const pos = findTextInDocument(editor, suggestion.original);
      if (pos.from !== -1) {
        editor.commands.addChange({
          type: 'modification',
          position: pos,
          originalText: suggestion.original,
          suggestedText: suggestion.suggested,
          metadata: { source: 'llm-batch', index }
        });
      }
    }, index * 500); // Stagger for visual effect
  });
}; 