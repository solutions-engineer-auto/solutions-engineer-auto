/**
 * Test script to diagnose AI Edit token limit issues
 * Run this in the browser console when the document editor is open
 */

(function() {
  console.log('🔍 AI Edit Token Limit Diagnostic Test');
  console.log('=====================================');
  
  // Check if editor exists
  if (!window.editor) {
    console.error('❌ Editor not found. Please open a document first.');
    return;
  }
  
  // Check if directAIEditService is available
  const hasService = typeof window.getDirectAISuggestions !== 'undefined' || 
                     typeof import.meta !== 'undefined';
  
  console.log('✅ Editor found');
  console.log(`${hasService ? '✅' : '❌'} AI Edit Service available`);
  
  // Test different text lengths
  const testCases = [
    {
      name: 'Short text (should work)',
      text: 'This is a short sentence.',
      instruction: 'Make it formal'
    },
    {
      name: 'Medium text (might work)',
      text: 'This is a medium-length paragraph that contains enough words to test the token limit but not so many that it would definitely exceed it. The goal is to see if this amount of text can be processed successfully by the AI edit service without truncation.',
      instruction: 'Make it more concise and professional'
    },
    {
      name: 'Long text (likely to fail)',
      text: `This is a very long paragraph designed to test the token limit of the AI edit service. When processing this amount of text, the combination of the system prompt, user prompt, and expected JSON response will likely exceed the 500 token limit set in the service. This should result in a truncated response that causes JSON parsing errors. The symptoms would include malformed JSON responses, incomplete edit suggestions, or the service falling back to a "no changes" response. To properly handle this, the token limit needs to be increased or the text needs to be chunked into smaller pieces. This paragraph continues to add more content to ensure we hit the token limit. Additional sentences are included here to make absolutely sure we exceed the threshold and can observe the failure mode.`,
      instruction: 'Improve clarity and fix any grammar issues'
    }
  ];
  
  // Function to estimate tokens (rough approximation)
  function estimateTokens(text) {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }
  
  // Display token estimates
  console.log('\n📊 Token Estimates:');
  testCases.forEach(test => {
    const promptTokens = estimateTokens(test.text + test.instruction);
    const systemPromptTokens = 200; // Approximate system prompt size
    const totalTokens = promptTokens + systemPromptTokens;
    
    console.log(`\n${test.name}:`);
    console.log(`  Text length: ${test.text.length} chars`);
    console.log(`  Estimated tokens: ~${totalTokens}`);
    console.log(`  ${totalTokens > 500 ? '⚠️ EXCEEDS' : '✅ WITHIN'} 500 token limit`);
  });
  
  // Test the actual service (if available)
  console.log('\n🧪 Testing AI Edit Service...');
  
  // Create a function to test the service
  window.testAIEditTokenLimit = async function(caseIndex = 0) {
    const testCase = testCases[caseIndex];
    if (!testCase) {
      console.error('Invalid test case index');
      return;
    }
    
    console.log(`\nTesting: ${testCase.name}`);
    console.log(`Text: "${testCase.text.substring(0, 50)}..."`);
    console.log(`Instruction: "${testCase.instruction}"`);
    
    try {
      // Try to import the service
      const module = await import('/src/services/directAIEditService.js');
      const { getDirectAISuggestions } = module;
      
      console.log('⏳ Calling AI service...');
      const startTime = Date.now();
      
      const response = await getDirectAISuggestions({
        text: testCase.text,
        instruction: testCase.instruction
      });
      
      const elapsed = Date.now() - startTime;
      console.log(`✅ Response received in ${elapsed}ms`);
      console.log('Response:', response);
      
      // Check if response seems truncated
      if (response.edits && response.edits.length === 0) {
        console.warn('⚠️ No edits returned - might indicate a processing issue');
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      if (error.message.includes('JSON')) {
        console.error('🔴 JSON parsing error - likely due to truncated response!');
      }
      return null;
    }
  };
  
  // Provide instructions
  console.log('\n📝 Instructions:');
  console.log('1. Check if OpenAI API key is configured in environment');
  console.log('2. Run: await testAIEditTokenLimit(0) for short text test');
  console.log('3. Run: await testAIEditTokenLimit(1) for medium text test');
  console.log('4. Run: await testAIEditTokenLimit(2) for long text test');
  console.log('\n💡 If long text fails with JSON errors, token limit is confirmed');
  
  // Also check current configuration
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    console.log('\n✅ OpenAI API key is configured');
  } else {
    console.warn('\n⚠️ OpenAI API key not found in environment');
  }
  
})(); 