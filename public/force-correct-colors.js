/**
 * Force Correct Colors
 * Nuclear option - remove ALL CSS and let inline styles work
 */

console.log('💣 Forcing correct colors (nuclear option)');

// Step 1: Remove ALL diff-related CSS
const allStyles = document.querySelectorAll('style');
allStyles.forEach(style => {
  if (style.textContent.includes('diff-')) {
    style.remove();
    console.log('✅ Removed style element with diff rules');
  }
});

// Step 2: Remove the specific diff-mark-styles element
const diffStyles = document.getElementById('diff-mark-styles');
if (diffStyles) {
  diffStyles.remove();
  console.log('✅ Removed diff-mark-styles element');
}

// Step 3: Add minimal CSS that doesn't override colors
const minimalStyle = document.createElement('style');
minimalStyle.id = 'diff-mark-minimal';
minimalStyle.textContent = `
  /* Minimal diff styles - NO COLOR OVERRIDES */
  .diff-mark {
    cursor: pointer;
    transition: opacity 0.2s;
    position: relative;
  }
  
  .diff-mark:hover {
    opacity: 0.9;
  }
  
  /* Only structural styles, no colors */
  .diff-deletion {
    text-decoration: line-through;
  }
  
  .diff-accepted {
    opacity: 0.6;
  }
`;
document.head.appendChild(minimalStyle);
console.log('✅ Added minimal CSS without color overrides');

// Step 4: Force re-render all marks
if (window.editor && window.editor.storage.diffV2) {
  const storage = window.editor.storage.diffV2;
  const editor = window.editor;
  
  console.log('\n🔄 Re-rendering all marks...');
  
  // Get all changes
  const changes = storage.changeManager.getChanges();
  console.log(`Found ${changes.length} changes to re-render`);
  
  // Remove all marks
  editor.commands.command(({ tr, dispatch }) => {
    if (dispatch) {
      tr.removeMark(0, tr.doc.content.size, editor.schema.marks.diffMark);
    }
    return true;
  });
  
  // Re-apply each change
  setTimeout(() => {
    changes.forEach((change, i) => {
      console.log(`\nRe-applying ${change.type} mark ${i + 1}:`, {
        type: change.type,
        from: change.position.from,
        to: change.position.to,
        text: change.originalText
      });
      
      // Apply mark with explicit type
      const success = editor.commands.markDiff(
        change.position.from,
        change.position.to,
        change.type,  // This should determine the color
        change.id,
        change.status
      );
      
      console.log(`Success: ${success}`);
    });
    
    // Check results
    setTimeout(() => {
      const marks = document.querySelectorAll('[data-diff-type]');
      console.log(`\n📊 Result: ${marks.length} marks rendered`);
      
      marks.forEach((mark, i) => {
        const computed = window.getComputedStyle(mark);
        console.log(`\nMark ${i + 1} (${mark.dataset.diffType}):`, {
          inlineStyle: mark.style.cssText,
          computedBg: computed.backgroundColor,
          computedBorder: computed.borderBottom,
          text: mark.textContent
        });
      });
      
      // Color legend
      console.log('\n🎨 Expected colors:');
      console.log('- deletion: Red (#ef4444) with strikethrough');
      console.log('- modification: Cyan (#06b6d4)');
      console.log('- addition: Green (#10b981)');
      
    }, 200);
  }, 100);
}

console.log('\n✅ Force color fix complete!');
console.log('If colors are still wrong, the issue is in mark creation, not CSS.'); 