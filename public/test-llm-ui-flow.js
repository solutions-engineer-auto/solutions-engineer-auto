// LLM UI Flow Test - Blue Modifications with Overlay
console.log('🤖 Testing LLM Suggestion UI Flow\n');

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
  
  // Enable diff mode
  editor.commands.toggleDiffMode();
  console.log('✅ Diff mode enabled');
  
  // Simulate a document with user text
  editor.commands.setContent(`
    <p>Dear Customer,</p>
    <p>I hope this email finds you well. I wanted to reach out about our new product line.</p>
    <p>The products are really cool and I think you'll love them!</p>
    <p>Let me know if you want to chat about it.</p>
    <p>Thanks!</p>
  `);
  
  console.log('📝 Document loaded\n');
  
  // Simulate LLM suggestions for making the email more professional
  const llmSuggestions = [
    {
      find: 'I hope this email finds you well',
      replace: 'I trust this message finds you in good health',
      reason: 'More formal greeting'
    },
    {
      find: 'really cool',
      replace: 'innovative and compelling',
      reason: 'More professional language'
    },
    {
      find: "I think you'll love them",
      replace: 'I believe they will exceed your expectations',
      reason: 'More confident and professional'
    },
    {
      find: 'chat about it',
      replace: 'discuss this opportunity further',
      reason: 'More formal closing'
    }
  ];
  
  console.log('🤖 LLM Suggestions:');
  llmSuggestions.forEach((s, i) => {
    console.log(`${i + 1}. "${s.find}" → "${s.replace}"`);
    console.log(`   Reason: ${s.reason}`);
  });
  console.log('');
  
  // Apply suggestions as diff marks
  let addedCount = 0;
  llmSuggestions.forEach((suggestion, index) => {
    // Find the text position
    let foundPos = { from: -1, to: -1 };
    editor.state.doc.descendants((node, pos) => {
      if (node.isText && node.text.includes(suggestion.find)) {
        const idx = node.text.indexOf(suggestion.find);
        foundPos.from = pos + idx;
        foundPos.to = pos + idx + suggestion.find.length;
        return false;
      }
    });
    
    if (foundPos.from !== -1) {
      // Add the change
      const change = {
        type: 'modification',
        originalText: suggestion.find,
        suggestedText: suggestion.replace,
        position: foundPos,
        instruction: suggestion.reason
      };
      
      setTimeout(() => {
        editor.commands.addChange(change);
        console.log(`✅ Added suggestion ${index + 1}: "${suggestion.find}"`);
      }, index * 200); // Stagger for visual effect
      
      addedCount++;
    }
  });
  
  // Wait for all changes to be added
  await new Promise(resolve => setTimeout(resolve, llmSuggestions.length * 200 + 500));
  
  console.log(`\n✅ Added ${addedCount} suggestions as blue modifications\n`);
  
  console.log('📋 INSTRUCTIONS:');
  console.log('1. Look at the document - you should see 4 cyan highlights');
  console.log('2. Click on any cyan text to see the LLM suggestion');
  console.log('3. The overlay shows:');
  console.log('   - Original text in red');
  console.log('   - Suggested text in green');
  console.log('   - Confirm/Decline buttons');
  console.log('4. Click "Confirm" to accept the suggestion');
  console.log('5. Click "Decline" to keep the original');
  console.log('');
  console.log('💡 This simulates how an LLM would suggest improvements!');
  
  // Helper to accept all
  window.acceptAllSuggestions = () => {
    console.log('\n✅ Accepting all suggestions...');
    const changes = editor.storage.diffV2.changeManager.getChanges();
    changes.forEach((change, index) => {
      setTimeout(() => {
        editor.commands.acceptChange(change.id);
        console.log(`   Accepted: "${change.originalText}" → "${change.suggestedText}"`);
      }, index * 300);
    });
  };
  
  // Helper to show current text
  window.showFinalText = () => {
    console.log('\n📄 Current document text:');
    console.log(editor.state.doc.textContent);
  };
  
  console.log('\n🎮 HELPER FUNCTIONS:');
  console.log('- acceptAllSuggestions() - Accept all LLM suggestions');
  console.log('- showFinalText() - Show the current document text');
})(); 