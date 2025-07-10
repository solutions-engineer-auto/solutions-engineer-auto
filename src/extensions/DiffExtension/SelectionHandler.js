/**
 * SelectionHandler - Handles text selection and extraction with robust position tracking
 * 
 * This is a critical component that prevents position offset errors by using
 * stable anchors and careful position mapping.
 */

export class SelectionHandler {
  constructor(editor) {
    this.editor = editor;
    // Map to store stable positions for tracking changes
    this.positionMap = new Map();
    // Counter for generating unique IDs
    this.idCounter = 0;
  }

  /**
   * Get quarantine zone based on selection mode
   * @param {string} mode - 'word' | 'sentence' | 'paragraph' | 'section'
   * @returns {Object} Quarantine zone with boundaries and context
   */
  getQuarantineZone(mode = 'paragraph') {
    const { selection } = this.editor.state;
    const { $from, $to } = selection;
    
    // For now, focusing on paragraph mode with extensible architecture
    switch (mode) {
      case 'word':
        // TODO: Implement word boundaries
        return this.getWordBoundaries($from, $to);
      case 'sentence':
        // TODO: Implement sentence boundaries
        return this.getSentenceBoundaries($from, $to);
      case 'paragraph':
        return this.getParagraphBoundaries($from, $to);
      case 'section':
        // TODO: Implement section boundaries
        return this.getSectionBoundaries($from, $to);
      default:
        return this.getParagraphBoundaries($from, $to);
    }
  }

  /**
   * Get paragraph boundaries with stable position tracking
   * @private
   */
  getParagraphBoundaries($from, $to) {
    // Get the depth of the paragraph nodes
    const fromDepth = this.findParagraphDepth($from);
    const toDepth = this.findParagraphDepth($to);
    
    if (fromDepth === -1 || toDepth === -1) {
      throw new Error('Selection is not within paragraphs');
    }
    
    // Get the paragraph nodes
    const startNode = $from.node(fromDepth);
    const endNode = $to.node(toDepth);
    
    // Calculate absolute positions
    const startPos = $from.start(fromDepth);
    const endPos = $to.end(toDepth);
    
    // Create stable anchor for position tracking
    const anchorId = this.createStableAnchor(startPos, endPos, $from, $to);
    
    // Extract text content
    const textContent = this.editor.state.doc.textBetween(startPos, endPos, '\n');
    
    // Get context (text before and after the selection)
    const contextBefore = this.getContextBefore(startPos, 200); // 200 chars of context
    const contextAfter = this.getContextAfter(endPos, 200);
    
    return {
      id: anchorId,
      mode: 'paragraph',
      boundaries: {
        from: startPos,
        to: endPos,
        // Store relative positions within paragraphs for extra stability
        relativeFrom: $from.parentOffset,
        relativeTo: $to.parentOffset
      },
      content: textContent,
      context: {
        before: contextBefore,
        after: contextAfter
      },
      metadata: {
        nodeTypes: [startNode.type.name, endNode.type.name],
        spanning: startNode !== endNode,
        paragraphCount: this.countParagraphsBetween($from, $to)
      },
      // Store path for robust position recovery
      path: {
        from: $from.path.slice(),
        to: $to.path.slice()
      }
    };
  }

  /**
   * Create a stable anchor for position tracking
   * This is crucial for maintaining correct positions after document changes
   * @private
   */
  createStableAnchor(startPos, endPos, $from, $to) {
    const anchorId = `anchor_${++this.idCounter}`;
    
    // Store comprehensive position data for recovery
    this.positionMap.set(anchorId, {
      absoluteStart: startPos,
      absoluteEnd: endPos,
      // Store content hash for validation
      contentHash: this.hashContent(
        this.editor.state.doc.textBetween(startPos, endPos)
      ),
      // Store surrounding content for fuzzy matching if positions shift
      surroundingContent: {
        before: this.editor.state.doc.textBetween(
          Math.max(0, startPos - 50), 
          startPos
        ),
        after: this.editor.state.doc.textBetween(
          endPos, 
          Math.min(this.editor.state.doc.content.size, endPos + 50)
        )
      },
      timestamp: Date.now()
    });
    
    return anchorId;
  }

  /**
   * Recover positions after document changes using stable anchors
   * @param {string} anchorId - The anchor ID to recover
   * @returns {Object|null} Recovered positions or null if unrecoverable
   */
  recoverPosition(anchorId) {
    const anchor = this.positionMap.get(anchorId);
    if (!anchor) return null;
    
    // First try: Check if positions are still valid
    const { absoluteStart, absoluteEnd } = anchor;
    
    try {
      const currentContent = this.editor.state.doc.textBetween(
        absoluteStart, 
        absoluteEnd
      );
      const currentHash = this.hashContent(currentContent);
      
      // If content matches, positions are still valid
      if (currentHash === anchor.contentHash) {
        return { from: absoluteStart, to: absoluteEnd };
      }
    } catch (e) {
      // Positions are out of bounds, need to recover
    }
    
    // Second try: Fuzzy search using surrounding content
    return this.fuzzyPositionRecovery(anchor);
  }

  /**
   * Fuzzy position recovery when exact positions fail
   * @private
   */
  fuzzyPositionRecovery(anchor) {
    const { surroundingContent } = anchor;
    const doc = this.editor.state.doc;
    
    // Search for the surrounding content pattern
    let searchPos = 0;
    while (searchPos < doc.content.size) {
      try {
        // Look for the "before" content
        const beforeMatch = this.findTextInDoc(
          surroundingContent.before, 
          searchPos
        );
        
        if (beforeMatch !== -1) {
          const potentialStart = beforeMatch + surroundingContent.before.length;
          
          // Look for the "after" content
          const afterMatch = this.findTextInDoc(
            surroundingContent.after,
            potentialStart
          );
          
          if (afterMatch !== -1) {
            // Found a match!
            return {
              from: potentialStart,
              to: afterMatch,
              recovered: true
            };
          }
        }
        
        searchPos = beforeMatch + 1;
      } catch (e) {
        break;
      }
    }
    
    return null;
  }

  /**
   * Find paragraph depth for a resolved position
   * @private
   */
  findParagraphDepth($pos) {
    for (let d = $pos.depth; d > 0; d--) {
      const node = $pos.node(d);
      if (node.type.name === 'paragraph' || 
          node.type.name === 'heading' ||
          node.type.name === 'blockquote') {
        return d;
      }
    }
    return -1;
  }

  /**
   * Get context before the selection
   * @private
   */
  getContextBefore(pos, maxChars = 200) {
    const start = Math.max(0, pos - maxChars);
    try {
      return this.editor.state.doc.textBetween(start, pos, ' ');
    } catch (e) {
      return '';
    }
  }

  /**
   * Get context after the selection
   * @private
   */
  getContextAfter(pos, maxChars = 200) {
    const end = Math.min(this.editor.state.doc.content.size, pos + maxChars);
    try {
      return this.editor.state.doc.textBetween(pos, end, ' ');
    } catch (e) {
      return '';
    }
  }

  /**
   * Count paragraphs between two positions
   * @private
   */
  countParagraphsBetween($from, $to) {
    let count = 0;
    this.editor.state.doc.nodesBetween($from.pos, $to.pos, (node) => {
      if (node.type.name === 'paragraph') count++;
    });
    return count;
  }

  /**
   * Simple hash function for content comparison
   * @private
   */
  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Find text in document starting from position
   * @private
   */
  findTextInDoc(text, startPos = 0) {
    const docText = this.editor.state.doc.textContent;
    return docText.indexOf(text, startPos);
  }

  /**
   * Placeholder for word boundaries (to be implemented)
   * @private
   */
  getWordBoundaries($from, $to) {
    // TODO: Implement word-level selection
    console.warn('Word boundaries not yet implemented, falling back to paragraph');
    return this.getParagraphBoundaries($from, $to);
  }

  /**
   * Placeholder for sentence boundaries (to be implemented)
   * @private
   */
  getSentenceBoundaries($from, $to) {
    // TODO: Implement sentence-level selection
    console.warn('Sentence boundaries not yet implemented, falling back to paragraph');
    return this.getParagraphBoundaries($from, $to);
  }

  /**
   * Placeholder for section boundaries (to be implemented)
   * @private
   */
  getSectionBoundaries($from, $to) {
    // TODO: Implement section-level selection (e.g., between headings)
    console.warn('Section boundaries not yet implemented, falling back to paragraph');
    return this.getParagraphBoundaries($from, $to);
  }

  /**
   * Clean up old anchors to prevent memory leaks
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupAnchors(maxAge = 3600000) {
    const now = Date.now();
    for (const [id, anchor] of this.positionMap.entries()) {
      if (now - anchor.timestamp > maxAge) {
        this.positionMap.delete(id);
      }
    }
  }
} 