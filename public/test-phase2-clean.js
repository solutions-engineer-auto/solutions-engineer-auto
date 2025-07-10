/**
 * Clean Phase 2 Test - After fixing double application issue
 */

console.log('🧪 PHASE 2 CLEAN TEST');
console.log('===================');

// Quick helper to add visual feedback
function showSuccess(message) {
  console.log(`✅ ${message}`);
}

function showError(message) {
  console.error(`❌ ${message}`);
}

// Main test
if (!window.editor) {
  showError('No editor found!');
} else {
  const editor = window.editor;
  const storage = editor.storage.diffV2;
  
  // Step 1: Enable diff mode
  console.log('\n1️⃣ Enabling diff mode...');
  editor.commands.toggleDiffMode();
  showSuccess(`Diff mode: ${storage.isActive}`);
  
  // Step 2: Add a simple change
  console.log('\n2️⃣ Adding test change...');
  const success = editor.commands.addChange({
    type: 'modification',
    position: { from: 1, to: 11 },
    originalText: 'TEMPLATE: ',
    suggestedText: 'MODIFIED: ',
    metadata: { 
      source: 'clean-test',
      reason: 'Testing Phase 2'
    }
  });
  
  if (success) {
    showSuccess('Change added successfully');
    
    // Step 3: Check results
    setTimeout(() => {
      console.log('\n3️⃣ Checking results...');
      
      // Check changes in storage
      const changes = storage.changeManager.getChanges();
      console.log('- Changes in storage:', changes.length);
      if (changes.length > 0) {
        console.table(changes[0]);
      }
      
      // Check marks in DOM
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log('- Marks in DOM:', marks.length);
      
      if (marks.length > 0) {
        showSuccess('DIFF MARKS ARE VISIBLE!');
        console.log('\n📋 Mark details:');
        marks.forEach((mark, i) => {
          console.log(`Mark ${i + 1}:`, {
            type: mark.dataset.diffType,
            changeId: mark.dataset.changeId,
            status: mark.dataset.status,
            text: mark.textContent,
            classes: mark.className
          });
        });
        
        console.log('\n🎨 Visual check:');
        console.log('- Should see cyan/blue underline on "TEMPLATE:"');
        console.log('- Should have hover effect');
        console.log('- Click functionality coming in next phase');
      } else {
        showError('No marks visible in DOM');
      }
      
      // Step 4: Test adding another change
      console.log('\n4️⃣ Adding second change...');
      const success2 = editor.commands.addChange({
        type: 'addition',
        position: { from: 280, to: 280 },
        originalText: '',
        suggestedText: '\n\n[New section added]',
        metadata: { source: 'clean-test-2' }
      });
      
      if (success2) {
        showSuccess('Second change added');
        setTimeout(() => {
          const marks2 = document.querySelectorAll('[data-diff-type]');
          console.log('- Total marks now:', marks2.length);
        }, 100);
      }
      
    }, 100);
  } else {
    showError('Failed to add change');
  }
  
  // Provide cleanup helper
  window.diffClean = {
    reset: () => {
      // Clear all changes
      storage.changeManager.clear();
      // Toggle diff mode off and on
      editor.commands.toggleDiffMode();
      editor.commands.toggleDiffMode();
      console.log('✨ Reset complete');
    },
    
    info: () => {
      console.log('📊 Current state:');
      console.log('- Diff mode:', storage.isActive);
      console.log('- Changes:', storage.changeManager.getChanges().length);
      console.log('- Marks in DOM:', document.querySelectorAll('[data-diff-type]').length);
      console.log('- Editor size:', editor.state.doc.content.size);
    }
  };
  
  console.log('\n💡 Helpers available:');
  console.log('- diffClean.reset() - Clear everything');
  console.log('- diffClean.info() - Show current state');
} 