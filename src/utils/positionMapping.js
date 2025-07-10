/**
 * Position mapping utilities for maintaining stable positions after document edits
 * 
 * This is crucial for preventing the offset errors that can occur when
 * the document is modified after positions are recorded.
 */

/**
 * Maps positions through a series of document transformations
 * @param {number} pos - Original position
 * @param {Array} mappings - Array of ProseMirror mappings
 * @returns {number} New position after transformations
 */
export function mapPosition(pos, mappings) {
  let result = pos;
  
  for (const mapping of mappings) {
    result = mapping.map(result);
  }
  
  return result;
}

/**
 * Create a position anchor that survives document changes
 * @param {Object} doc - ProseMirror document
 * @param {number} pos - Position to anchor
 * @returns {Object} Anchor object with recovery information
 */
export function createPositionAnchor(doc, pos) {
  // Get surrounding context for recovery
  const contextRadius = 50;
  const before = doc.textBetween(
    Math.max(0, pos - contextRadius),
    pos,
    ' '
  );
  const after = doc.textBetween(
    pos,
    Math.min(doc.content.size, pos + contextRadius),
    ' '
  );
  
  // Get structural path to the position
  const $pos = doc.resolve(pos);
  const path = [];
  
  for (let i = 0; i <= $pos.depth; i++) {
    path.push({
      index: $pos.index(i),
      offset: $pos.parentOffset,
      nodeType: $pos.node(i).type.name
    });
  }
  
  return {
    pos,
    before,
    after,
    path,
    timestamp: Date.now()
  };
}

/**
 * Recover a position from an anchor after document changes
 * @param {Object} doc - Current ProseMirror document
 * @param {Object} anchor - Position anchor
 * @returns {number|null} Recovered position or null if unrecoverable
 */
export function recoverPositionFromAnchor(doc, anchor) {
  // First, try to find by surrounding context
  const docText = doc.textContent;
  const searchPattern = anchor.before + anchor.after;
  
  if (searchPattern.length > 10) {
    const index = docText.indexOf(searchPattern);
    if (index !== -1) {
      return index + anchor.before.length;
    }
  }
  
  // Fallback: Try to reconstruct from path
  try {
    let pos = 0;
    let node = doc;
    
    for (let i = 0; i < anchor.path.length - 1; i++) {
      const step = anchor.path[i];
      const child = node.child(step.index);
      
      if (!child || child.type.name !== step.nodeType) {
        // Structure has changed, can't recover
        return null;
      }
      
      pos += node.content.findIndex(child).offset;
      node = child;
    }
    
    return pos + anchor.path[anchor.path.length - 1].offset;
  } catch (e) {
    return null;
  }
}

/**
 * Track position changes through a transaction
 * @param {Object} tr - ProseMirror transaction
 * @param {Array} positions - Array of positions to track
 * @returns {Array} Updated positions
 */
export function trackPositions(tr, positions) {
  return positions.map(pos => {
    // Map through all steps in the transaction
    let mapped = pos;
    tr.mapping.maps.forEach((map, i) => {
      mapped = tr.mapping.slice(0, i + 1).map(mapped);
    });
    return mapped;
  });
}

/**
 * Calculate the offset caused by a change
 * @param {Object} change - Change object with from, to, and inserted text length
 * @returns {number} Offset amount
 */
export function calculateChangeOffset(change) {
  const deletedLength = change.to - change.from;
  const insertedLength = change.insertedLength || 0;
  return insertedLength - deletedLength;
}

/**
 * Adjust positions after a change
 * @param {Array} positions - Array of positions
 * @param {Object} change - Change object
 * @returns {Array} Adjusted positions
 */
export function adjustPositionsAfterChange(positions, change) {
  const offset = calculateChangeOffset(change);
  
  return positions.map(pos => {
    if (pos <= change.from) {
      // Position is before the change, no adjustment needed
      return pos;
    } else if (pos >= change.to) {
      // Position is after the change, adjust by offset
      return pos + offset;
    } else {
      // Position is within the changed region
      // This is problematic - the position may no longer be valid
      // Return the start of the change as a fallback
      return change.from;
    }
  });
}

/**
 * Create a stable reference for a text range
 * @param {Object} doc - ProseMirror document
 * @param {number} from - Start position
 * @param {number} to - End position
 * @returns {Object} Stable reference object
 */
export function createRangeReference(doc, from, to) {
  return {
    start: createPositionAnchor(doc, from),
    end: createPositionAnchor(doc, to),
    content: doc.textBetween(from, to),
    checksum: hashText(doc.textBetween(from, to))
  };
}

/**
 * Simple hash function for text verification
 * @param {string} text - Text to hash
 * @returns {string} Hash string
 */
function hashText(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Validate that a range reference is still valid
 * @param {Object} doc - Current document
 * @param {Object} reference - Range reference
 * @returns {boolean} Whether the reference is still valid
 */
export function validateRangeReference(doc, reference) {
  const startPos = recoverPositionFromAnchor(doc, reference.start);
  const endPos = recoverPositionFromAnchor(doc, reference.end);
  
  if (startPos === null || endPos === null) {
    return false;
  }
  
  try {
    const currentContent = doc.textBetween(startPos, endPos);
    const currentChecksum = hashText(currentContent);
    return currentChecksum === reference.checksum;
  } catch (e) {
    return false;
  }
} 