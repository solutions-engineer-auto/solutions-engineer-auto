/**
 * AI Edit Scaling Test - Diagnose exact failure points
 * Run this in the browser console when document editor is open
 */

(async function() {
  console.log('🔬 AI Edit Scaling Diagnostic');
  console.log('============================\n');
  
  // Check if editor exists
  if (!window.editor) {
    console.error('❌ Please open a document editor first!');
    return;
  }
  
  // Test configurations
  const testSizes = [
    { chars: 100, name: 'Tiny (100 chars)' },
    { chars: 500, name: 'Small (500 chars)' },
    { chars: 1000, name: 'Medium (1K chars)' },
    { chars: 2000, name: 'Large (2K chars)' },
    { chars: 5000, name: 'XL (5K chars)' },
    { chars: 10000, name: 'XXL (10K chars)' },
    { chars: 20000, name: 'Huge (20K chars)' }
  ];
  
  // Generate test text of specific size
  function generateText(chars) {
    const baseText = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. ';
    let text = '';
    while (text.length < chars) {
      text += baseText;
    }
    return text.substring(0, chars);
  }
  
  // Estimate tokens (OpenAI rule: ~4 chars per token)
  function estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
  
  console.log('Starting scaling tests...\n');
  
  for (const test of testSizes) {
    console.log(`\n📏 Testing ${test.name}:`);
    console.log('─'.repeat(40));
    
    const testText = generateText(test.chars);
    const estimatedTokens = estimateTokens(testText);
    
    console.log(`Characters: ${testText.length}`);
    console.log(`Estimated tokens: ${estimatedTokens}`);
    
    try {
      const startTime = Date.now();
      
      // Import the service
      const module = await import('/src/services/directAIEditService.js');
      const { getDirectAISuggestions } = module;
      
      // Make the API call
      console.log('⏳ Calling API...');
      const response = await getDirectAISuggestions({
        text: testText,
        instruction: 'Make this text more concise'
      });
      
      const elapsed = Date.now() - startTime;
      
      // Check response
      if (response && response.edits) {
        console.log(`✅ SUCCESS in ${elapsed}ms`);
        console.log(`Edits returned: ${response.edits.length}`);
        
        // Check if response seems complete
        if (response.edits.length === 0) {
          console.warn('⚠️  No edits returned (possible processing issue)');
        }
      } else {
        console.error('❌ Invalid response structure');
      }
      
    } catch (error) {
      console.error(`❌ FAILED: ${error.message}`);
      
      // Analyze error type
      if (error.message.includes('timeout')) {
        console.error('   → Request timed out');
      } else if (error.message.includes('500')) {
        console.error('   → Server error (likely too large)');
      } else if (error.message.includes('JSON')) {
        console.error('   → Response truncated/malformed');
      }
    }
    
    // Small delay between tests
    if (test !== testSizes[testSizes.length - 1]) {
      console.log('\nWaiting 2s before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n\n📊 SCALING TEST SUMMARY');
  console.log('======================');
  console.log('If tests start failing at a specific size, that\'s your scaling limit.');
  console.log('Common failure patterns:');
  console.log('- Empty responses: Token limit reached');
  console.log('- Timeouts: Request too large for API');
  console.log('- Malformed JSON: Response truncated');
  
})(); 