/**
 * Test script to verify AI Edit modal closes after suggestions are applied
 * Run this in the browser console when document editor is open
 */

(function() {
  console.log('🧪 Testing AI Edit Modal Auto-Close Behavior');
  console.log('==========================================\n');
  
  // Check if editor exists
  if (!window.editor) {
    console.error('❌ No editor found! Please open a document first.');
    return;
  }
  
  console.log('✅ Editor found\n');
  
  // Instructions
  console.log('📝 INSTRUCTIONS:');
  console.log('1. Select some text in the editor');
  console.log('2. Press Cmd+K (or click "AI Edit" button)');
  console.log('3. Enter an instruction (e.g., "Make it more formal")');
  console.log('4. Click "Get AI Suggestions"\n');
  
  console.log('🎯 EXPECTED BEHAVIOR:');
  console.log('- Modal shows loading state while processing');
  console.log('- After suggestions are applied, modal automatically closes');
  console.log('- Notification appears explaining how to accept/reject changes');
  console.log('- Solid borders around suggested changes (not dashed)\n');
  
  // Monitor modal state
  let modalCheckInterval;
  let wasModalOpen = false;
  
  function checkModalState() {
    const modal = document.querySelector('[class*="AIEditModal"], .fixed.inset-0');
    const isModalOpen = modal && modal.style.display !== 'none';
    
    if (isModalOpen && !wasModalOpen) {
      console.log('✅ Modal opened');
      wasModalOpen = true;
    } else if (!isModalOpen && wasModalOpen) {
      console.log('✅ Modal closed automatically');
      wasModalOpen = false;
      
      // Check for notification
      setTimeout(() => {
        const notification = document.querySelector('.diff-suggestion-notification');
        if (notification) {
          console.log('✅ Suggestion notification appeared');
        } else {
          console.log('⚠️  No notification found - check if suggestions were added');
        }
      }, 200);
      
      // Stop monitoring
      clearInterval(modalCheckInterval);
    }
  }
  
  // Start monitoring when user is ready
  console.log('\n👉 When ready, press Enter to start monitoring...');
  
  // Listen for Enter key to start
  const startMonitoring = (e) => {
    if (e.key === 'Enter') {
      console.log('\n🔍 Monitoring started - now trigger the AI Edit...');
      modalCheckInterval = setInterval(checkModalState, 100);
      document.removeEventListener('keydown', startMonitoring);
      
      // Stop after 30 seconds
      setTimeout(() => {
        if (modalCheckInterval) {
          clearInterval(modalCheckInterval);
          console.log('\n⏱️ Monitoring stopped after 30 seconds');
        }
      }, 30000);
    }
  };
  
  document.addEventListener('keydown', startMonitoring);
})(); 