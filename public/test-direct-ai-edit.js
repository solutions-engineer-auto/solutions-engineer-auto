/**
 * Test Direct AI Edit Integration
 * 
 * Run this in the browser console to test the direct OpenAI integration
 */

console.log('🧪 Testing Direct AI Edit Integration...');

// Check if API key is configured
const apiKey = import.meta.env.VITE_OPENAI_API_KEY || 
               import.meta.env.VITE_OPENAPI_KEY || 
               import.meta.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ OpenAI API key not configured');
  console.log('Add one of these to your .env file:');
  console.log('  VITE_OPENAI_API_KEY=sk-...');
  console.log('  VITE_OPENAPI_KEY=sk-...');
} else {
  console.log('✅ OpenAI API key is configured');
}

// Test the service directly
async function testDirectAI() {
  try {
    const { getDirectAISuggestions } = await import('/src/services/directAIEditService.js');
    
    console.log('\n📝 Testing direct AI service...');
    
    const testText = "this is a test sentence that needs improvement";
    const instruction = "Make it more formal and professional";
    
    console.log('Input text:', testText);
    console.log('Instruction:', instruction);
    console.log('\nCalling OpenAI API...');
    
    const result = await getDirectAISuggestions({
      text: testText,
      instruction: instruction
    });
    
    console.log('✅ AI Response:', result);
    
    if (result.edits && result.edits.length > 0) {
      console.log('\n📋 Suggested edits:');
      result.edits.forEach(edit => {
        console.log(`- "${edit.target}" → "${edit.replacement}"`);
        console.log(`  Reason: ${edit.reason}`);
        console.log(`  Confidence: ${(edit.confidence * 100).toFixed(0)}%`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    if (error.message.includes('API key')) {
      console.log('\n💡 Make sure you have VITE_OPENAI_API_KEY in your .env file');
    }
  }
}

// Run the test
testDirectAI();

console.log('\n📌 You can also test the full integration:');
console.log('1. Select text in the editor');
console.log('2. Click "🧪 AI Edit" button');
console.log('3. Enter an instruction');
console.log('4. See the diff marks appear!'); 