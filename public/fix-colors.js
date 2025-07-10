/**
 * Quick Fix for Colors
 * Removes the old CSS and lets inline styles work
 */

console.log('🔧 Fixing diff mark colors...');

// Remove the old CSS
const oldStyle = document.getElementById('diff-mark-styles');
if (oldStyle) {
  oldStyle.remove();
  console.log('✅ Removed old CSS with !important overrides');
}

// Re-inject corrected CSS
const style = document.createElement('style');
style.id = 'diff-mark-styles';
style.textContent = `
  /* Diff mark styles - FIXED */
  .diff-mark {
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }
  
  .diff-mark:hover {
    filter: brightness(1.3);
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
  }
  
  /* Let inline styles from DiffMark.js take precedence */
  .diff-addition {
    /* Green - inline styles will override */
  }
  
  .diff-deletion {
    text-decoration: line-through;
    opacity: 0.8;
    /* Red - inline styles will override */
  }
  
  .diff-modification {
    /* Cyan - inline styles will override */
  }
  
  .diff-accepted {
    opacity: 0.6;
    filter: grayscale(0.5);
  }
`;
document.head.appendChild(style);
console.log('✅ Injected corrected CSS');

// Force re-render of all marks
if (window.editor && window.editor.storage.diffV2) {
  const storage = window.editor.storage.diffV2;
  
  // Clear all marks
  window.editor.commands.command(({ tr, dispatch }) => {
    if (dispatch) {
      tr.removeMark(0, tr.doc.content.size, window.editor.schema.marks.diffMark);
    }
    return true;
  });
  
  // Re-apply all marks
  setTimeout(() => {
    const changes = storage.changeManager.getChanges();
    changes.forEach(change => {
      storage.applyMarkForChange(change, window.editor);
    });
    console.log(`✅ Re-applied ${changes.length} marks with correct colors`);
    
    // Show what we have
    const marks = document.querySelectorAll('[data-diff-type]');
    marks.forEach((mark, i) => {
      const computed = window.getComputedStyle(mark);
      console.log(`Mark ${i + 1} (${mark.dataset.diffType}):`, {
        backgroundColor: computed.backgroundColor,
        borderBottom: computed.borderBottom
      });
    });
  }, 100);
}

console.log('\n✅ Colors should now be:');
console.log('- Deletions: RED with strikethrough');
console.log('- Modifications: CYAN');
console.log('- Additions: GREEN (if supported)'); 