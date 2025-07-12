/**
 * Edit Processor - Utilities for processing AI edit suggestions
 * and finding text positions in the editor
 */

/**
 * Find all occurrences of a text string in the editor
 * @param {Object} editor - TipTap editor instance
 * @param {string} targetText - Text to find
 * @returns {Array} Array of position objects {from, to}
 */
export function findAllOccurrences(editor, targetText) {
  const doc = editor.state.doc;
  const positions = [];
  
  doc.descendants((node, pos) => {
    if (node.isText) {
      let index = node.text.indexOf(targetText);
      while (index !== -1) {
        positions.push({
          from: pos + index,
          to: pos + index + targetText.length
        });
        index = node.text.indexOf(targetText, index + 1);
      }
    }
  });
  
  return positions;
}

/**
 * Validate that text at a position matches expected text
 * @param {Object} editor - TipTap editor instance
 * @param {number} from - Start position
 * @param {number} to - End position
 * @param {string} expectedText - Text we expect to find
 * @returns {boolean} True if text matches
 */
export function validateTextMatch(editor, from, to, expectedText) {
  try {
    const actualText = editor.state.doc.textBetween(from, to);
    if (actualText !== expectedText) {
      console.warn('[EditProcessor] Text mismatch:', {
        expected: expectedText,
        actual: actualText,
        from, to
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('[EditProcessor] Error validating text:', error);
    return false;
  }
}

/**
 * Process AI response and create diff marks
 * @param {Object} editor - TipTap editor instance
 * @param {Object} aiResponse - AI suggestions response
 * @param {Function} onProgress - Progress callback
 */
export function processAIEdits(editor, aiResponse, onProgress) {
  const results = {
    successful: 0,
    failed: 0,
    errors: []
  };
  
  // Ensure diff mode is active
  if (!editor.storage.diffV2?.isActive) {
    editor.commands.toggleDiffMode();
  }
  
  // Process each edit
  const edits = aiResponse.edits || [];
  
  // Handle case where no edits were suggested
  if (edits.length === 0) {
    results.errors.push('No changes suggested by AI');
    return results;
  }
  
  edits.forEach((edit, index) => {
    try {
      if (onProgress) {
        onProgress({
          current: index + 1,
          total: edits.length,
          message: `Processing edit ${index + 1} of ${edits.length}`
        });
      }
      
      // Handle single selection edits (current selection)
      if (!edit.occurrences || edit.occurrences.length === 0) {
        const { selection } = editor.state;
        const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
        
        // Validate the selection matches target
        if (selectedText === edit.target || !edit.target) {
          editor.commands.addChange({
            type: edit.type,
            originalText: edit.target || selectedText,
            suggestedText: edit.replacement,
            position: { from: selection.from, to: selection.to },
            metadata: {
              confidence: edit.confidence,
              reason: edit.reason,
              editId: edit.id
            }
          });
          results.successful++;
        } else {
          results.failed++;
          results.errors.push(`Selection doesn't match target for edit ${edit.id}`);
        }
      } else {
        // Handle multiple occurrences
        const positions = findAllOccurrences(editor, edit.target);
        
        edit.occurrences.forEach(occurrenceNum => {
          const index = occurrenceNum - 1; // Convert to 0-based
          const position = positions[index];
          
          if (position && validateTextMatch(editor, position.from, position.to, edit.target)) {
            editor.commands.addChange({
              type: edit.type,
              originalText: edit.target,
              suggestedText: edit.replacement,
              position: position,
              metadata: {
                confidence: edit.confidence,
                reason: edit.reason,
                editId: edit.id,
                occurrence: occurrenceNum
              }
            });
            results.successful++;
          } else {
            results.failed++;
            results.errors.push(`Occurrence ${occurrenceNum} not found for edit ${edit.id}`);
          }
        });
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`Error processing edit ${edit.id}: ${error.message}`);
      console.error('[EditProcessor] Error processing edit:', error);
    }
  });
  
  // Show notification about preview changes
  if (results.successful > 0) {
    showSuggestionNotification(results.successful);
  }
  
  return results;
}

/**
 * Show a notification that suggestions are preview only
 */
function showSuggestionNotification(count) {
  // Small delay to ensure modal is closing
  setTimeout(() => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'diff-suggestion-notification';
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(6, 182, 212, 0.95);
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 100000;
      font-family: system-ui, -apple-system, sans-serif;
      animation: slideDown 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <div style="font-size: 24px;">💡</div>
        <div>
          <div style="font-weight: 600; margin-bottom: 4px;">
            ${count} suggestion${count > 1 ? 's' : ''} added
          </div>
          <div style="font-size: 14px; opacity: 0.9;">
            Click on highlighted text to accept or reject changes
          </div>
        </div>
      </div>
    `;
    
    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translate(-50%, -20px);
          opacity: 0;
        }
        to {
          transform: translate(-50%, 0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideDown 0.3s ease-out reverse';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 5000);
  }, 100); // 100ms delay
}

/**
 * Create a simple hash of text for verification
 * @param {string} text - Text to hash
 * @returns {string} Simple hash
 */
export function simpleHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
} 