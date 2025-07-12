/**
 * AI Edit User Flow Test
 * This tests the actual user experience of using the AI edit feature
 */

console.log('🎯 AI Edit User Flow Test');
console.log('========================\n');

// Instructions
console.log('📝 INSTRUCTIONS:');
console.log('1. Make sure you have a document open in the editor');
console.log('2. Select some text (any text)');
console.log('3. Press Cmd+K (or Ctrl+K on Windows)');
console.log('4. You should see the AI Edit modal appear\n');

// Check if editor exists
if (!window.editor) {
  console.error('❌ No editor found! Please open a document first.');
} else {
  console.log('✅ Editor found\n');
  
  // Add some sample text if document is empty
  const currentContent = window.editor.getText();
  if (currentContent.trim().length < 50) {
    console.log('📄 Adding sample text to document...');
    window.editor.commands.setContent(`
      <h2>Sample Document for Testing</h2>
      <p>This is a sample paragraph that you can use to test the AI edit feature. Select any part of this text and press Cmd+K to see the AI edit modal.</p>
      <p>The AI can help you make this text more formal, simplify it, expand it with more details, or transform it in various other ways.</p>
      <p>Try selecting this sentence and asking the AI to make it more engaging!</p>
    `);
    console.log('✅ Sample text added\n');
  }
  
  // Monitor for Cmd+K
  let lastKeyPress = null;
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      console.log('\n🎯 Cmd+K detected!');
      
      const selection = window.editor.state.selection;
      const hasSelection = !selection.empty;
      
      if (hasSelection) {
        const selectedText = window.editor.state.doc.textBetween(selection.from, selection.to);
        console.log('✅ Text selected:', selectedText.substring(0, 50) + '...');
        console.log('⏳ AI Edit modal should appear now...');
      } else {
        console.log('⚠️  No text selected! Please select some text first.');
      }
      
      lastKeyPress = Date.now();
    }
  });
  
  // Monitor for modal appearance
  const checkModal = setInterval(() => {
    const modal = document.querySelector('.fixed.inset-0.bg-black\\/50');
    const aiEditModal = Array.from(document.querySelectorAll('h2')).find(h2 => 
      h2.textContent.includes('AI Edit') || h2.textContent.includes('Suggest Edits')
    );
    
    if (modal && aiEditModal && lastKeyPress && (Date.now() - lastKeyPress < 5000)) {
      console.log('\n✅ SUCCESS! AI Edit modal is open!');
      console.log('📝 Now you can:');
      console.log('   - Type an instruction (e.g., "Make this more formal")');
      console.log('   - Click "Generate" to get AI suggestions');
      console.log('   - The AI will process your request and apply changes\n');
      
      clearInterval(checkModal);
    }
  }, 100);
  
  // Test the service directly
  console.log('\n🧪 Testing AI Edit Service directly...');
  
  import('/src/services/directAIEditService.js').then(() => {
    console.log('✅ AI Edit Service loaded');
    console.log('\n📊 Service capabilities:');
    console.log('- Maximum input: ~120K characters');
    console.log('- Response timeout: 30 seconds');
    console.log('- Supports: modifications, additions, deletions');
    console.log('- Returns: JSON with edit suggestions\n');
    
    // Check if API key is configured
    const hasApiKey = !!(import.meta.env.VITE_OPENAI_API_KEY || 
                        import.meta.env.VITE_OPENAPI_KEY || 
                        import.meta.env.OPENAI_API_KEY);
    
    if (hasApiKey) {
      console.log('✅ OpenAI API key is configured');
    } else {
      console.log('⚠️  No OpenAI API key found!');
      console.log('   Set VITE_OPENAI_API_KEY in your .env file');
    }
  }).catch(err => {
    console.error('❌ Failed to load AI Edit Service:', err);
  });
}

console.log('\n💡 TIP: Run the debug overlay for detailed info:');
console.log('   const script = document.createElement("script");');
console.log('   script.src = "/debug-ai-edit-live.js";');
console.log('   document.head.appendChild(script);'); 