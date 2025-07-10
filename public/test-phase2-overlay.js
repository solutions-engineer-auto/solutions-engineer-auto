/**
 * Test Phase 2 Overlay Interaction
 * Tests clicking on marks to show accept/reject buttons
 */

console.log('🎯 PHASE 2 OVERLAY TEST');
console.log('======================');

if (!window.editor) {
  console.error('❌ No editor found!');
} else {
  const editor = window.editor;
  const storage = editor.storage.diffV2;
  
  // Enable diff mode if not already
  if (!storage.isActive) {
    console.log('🔄 Enabling diff mode...');
    editor.commands.toggleDiffMode();
  }
  
  // Clear any existing changes
  storage.changeManager.clear();
  
  // Add a test change
  console.log('📝 Adding test change...');
  const success = editor.commands.addChange({
    type: 'modification',
    position: { from: 1, to: 11 },
    originalText: 'TEMPLATE: ',
    suggestedText: 'UPDATED: ',
    metadata: { 
      source: 'overlay-test',
      description: 'Testing overlay functionality'
    }
  });
  
  if (success) {
    console.log('✅ Change added successfully');
    
    setTimeout(() => {
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log(`Found ${marks.length} mark(s)`);
      
      if (marks.length > 0) {
        const firstMark = marks[0];
        console.log('📍 Mark details:', {
          type: firstMark.dataset.diffType,
          changeId: firstMark.dataset.changeId,
          text: firstMark.textContent
        });
        
        console.log('\n💡 Instructions:');
        console.log('1. Click on the highlighted text "TEMPLATE:"');
        console.log('2. You should see Accept/Reject buttons appear');
        console.log('3. Click Accept to accept the change');
        console.log('4. Click Reject to reject and remove the highlight');
        console.log('\n🔍 Watch for errors in the console');
        
        // Add helper to simulate click
        window.testClick = () => {
          console.log('🖱️ Simulating click on mark...');
          const event = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            view: window
          });
          firstMark.dispatchEvent(event);
        };
        
        console.log('\n💡 Helper: Run testClick() to simulate clicking the mark');
      }
    }, 100);
  }
  
  // Add multiple changes test
  window.testMultiple = () => {
    console.log('\n📝 Adding multiple changes...');
    
    // Add 3 more changes at different positions
    const changes = [
      {
        type: 'addition',
        position: { from: 280, to: 280 },
        originalText: '',
        suggestedText: '\n[Added section]',
        metadata: { source: 'multi-test-1' }
      },
      {
        type: 'deletion',
        position: { from: 460, to: 500 },
        originalText: '[Value Prop 1]: [Brief description]',
        suggestedText: '',
        metadata: { source: 'multi-test-2' }
      },
      {
        type: 'modification',
        position: { from: 39, to: 62 },
        originalText: 'Sales Proposal Template',
        suggestedText: 'Enhanced Sales Template',
        metadata: { source: 'multi-test-3' }
      }
    ];
    
    changes.forEach((change, i) => {
      setTimeout(() => {
        const success = editor.commands.addChange(change);
        console.log(`Change ${i + 1}: ${success ? '✅' : '❌'}`);
      }, i * 100);
    });
    
    setTimeout(() => {
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log(`\nTotal marks: ${marks.length}`);
      marks.forEach((mark, i) => {
        console.log(`Mark ${i + 1}:`, {
          type: mark.dataset.diffType,
          text: mark.textContent.substring(0, 30) + '...'
        });
      });
    }, 500);
  };
  
  console.log('\n💡 Additional helpers:');
  console.log('- testMultiple() - Add multiple changes');
} 