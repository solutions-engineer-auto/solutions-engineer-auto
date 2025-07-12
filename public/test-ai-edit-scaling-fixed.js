/**
 * Test the improved AI Edit scaling
 * Run this in the browser console when document editor is open
 */

(async function() {
  console.log('🚀 Testing AI Edit Scaling Improvements');
  console.log('=====================================\n');
  
  // Check if editor exists
  if (!window.editor) {
    console.error('❌ Please open a document editor first!');
    return;
  }
  
  try {
    // Import the service
    const module = await import('/src/services/directAIEditService.js');
    const { getDirectAISuggestions } = module;
    
    // Test 1: Normal size text (should work)
    console.log('📝 Test 1: Normal text (1K chars)');
    const normalText = 'Lorem ipsum dolor sit amet. '.repeat(35);
    console.log(`Text size: ${normalText.length} chars`);
    
    const startTime = Date.now();
    const response1 = await getDirectAISuggestions({
      text: normalText,
      instruction: 'Make this more concise'
    });
    
    console.log(`✅ Success in ${Date.now() - startTime}ms`);
    console.log(`Edits returned: ${response1.edits.length}\n`);
    
    // Test 2: Large text (should still work)
    console.log('📝 Test 2: Large text (10K chars)');
    const largeText = normalText.repeat(10);
    console.log(`Text size: ${largeText.length} chars`);
    
    const startTime2 = Date.now();
    const response2 = await getDirectAISuggestions({
      text: largeText,
      instruction: 'Summarize this'
    });
    
    console.log(`✅ Success in ${Date.now() - startTime2}ms`);
    console.log(`Edits returned: ${response2.edits.length}\n`);
    
    // Test 3: Too large text (should fail gracefully)
    console.log('📝 Test 3: Too large text (150K chars)');
    const hugeText = normalText.repeat(150);
    console.log(`Text size: ${hugeText.length} chars`);
    
    try {
      await getDirectAISuggestions({
        text: hugeText,
        instruction: 'Edit this'
      });
      console.log('❌ Should have failed but didn\'t');
    } catch (error) {
      console.log(`✅ Failed as expected: ${error.message}\n`);
    }
    
    console.log('🎉 All tests completed!');
    console.log('\nKey improvements:');
    console.log('- 30-second timeout prevents hanging');
    console.log('- Better token calculation (up to 16K output)');
    console.log('- Upfront size validation');
    console.log('- Clear error messages');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
})(); 