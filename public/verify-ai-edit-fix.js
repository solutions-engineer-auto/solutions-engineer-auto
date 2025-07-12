/**
 * Quick verification script for AI Edit Token Limit Fix
 * Run this to verify the fix is working properly
 */

(async function() {
  console.log('🔧 Verifying AI Edit Token Limit Fix...\n');
  
  // Check if we're in the document editor
  if (!window.editor) {
    console.error('❌ Please open a document editor first!');
    return;
  }
  
  // Test case that previously failed
  const longText = `The implementation of our new authentication system requires careful consideration of security best practices. We need to ensure that user credentials are properly encrypted, sessions are managed securely, and that we implement proper rate limiting to prevent brute force attacks. Additionally, we should consider implementing multi-factor authentication for enhanced security. The system should also include proper logging and monitoring capabilities to detect and respond to potential security threats in real-time.`;
  
  const instruction = "Make this more concise while keeping all the key security points";
  
  console.log('📝 Test Input:');
  console.log(`Text: "${longText.substring(0, 60)}..."`);
  console.log(`Length: ${longText.length} characters (~${Math.ceil(longText.length/4)} tokens)`);
  console.log(`Instruction: "${instruction}"`);
  
  try {
    // Import and test the service
    const module = await import('/src/services/directAIEditService.js');
    const { getDirectAISuggestions } = module;
    
    console.log('\n⏳ Calling AI service with long text...');
    const startTime = Date.now();
    
    const response = await getDirectAISuggestions({
      text: longText,
      instruction: instruction
    });
    
    const elapsed = Date.now() - startTime;
    
    // Check results
    console.log(`\n✅ Response received in ${elapsed}ms`);
    console.log('📊 Results:');
    console.log(`- Valid JSON: ${typeof response === 'object' ? '✅ Yes' : '❌ No'}`);
    console.log(`- Has edits array: ${Array.isArray(response.edits) ? '✅ Yes' : '❌ No'}`);
    console.log(`- Number of edits: ${response.edits?.length || 0}`);
    
    if (response.edits && response.edits.length > 0) {
      console.log('\n📝 First edit suggestion:');
      const firstEdit = response.edits[0];
      console.log(`- Type: ${firstEdit.type}`);
      console.log(`- Confidence: ${firstEdit.confidence}`);
      console.log(`- Reason: ${firstEdit.reason}`);
      console.log(`- Preview: "${(firstEdit.replacement || '').substring(0, 60)}..."`);
      
      console.log('\n✅ SUCCESS! The token limit fix is working properly.');
      console.log('The AI can now handle long text without JSON parsing errors.');
    } else {
      console.log('\n⚠️ No edits were suggested. This might indicate an issue.');
    }
    
    return response;
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    
    if (error.message.includes('API key')) {
      console.error('🔑 OpenAI API key is not configured.');
      console.error('Add VITE_OPENAI_API_KEY to your .env.local file');
    } else if (error.message.includes('JSON')) {
      console.error('🔴 JSON parsing still failing - the fix may not be applied correctly.');
      console.error('Check that directAIEditService.js has the updated code.');
    }
    
    return null;
  }
})();

console.log('\n💡 This test specifically uses long text that would have failed before the fix.'); 