/**
 * Context Builder Service
 * 
 * Extracts surrounding context and formats data for AI API requests.
 * This ensures the AI has enough context to make intelligent edits
 * while respecting quarantine zone boundaries.
 */

export class ContextBuilder {
  constructor(editor) {
    this.editor = editor;
  }

  /**
   * Build context for AI request from selection
   * @param {Object} quarantineZone - Quarantine zone from SelectionHandler
   * @param {string} instruction - User's editing instruction
   * @returns {Object} Formatted context for API request
   */
  buildContext(quarantineZone, instruction) {
    // Validate quarantine zone
    if (!this.validateQuarantineZone(quarantineZone)) {
      throw new Error('Invalid quarantine zone');
    }

    // Get document metadata
    const documentMetadata = this.extractDocumentMetadata();
    
    // Build the context object according to API spec
    const context = {
      // Selection information
      selection: {
        from: quarantineZone.boundaries.from,
        to: quarantineZone.boundaries.to,
        text: quarantineZone.content
      },
      
      // Editing instruction
      instruction: instruction.trim(),
      
      // Mode (word/sentence/paragraph/section)
      mode: quarantineZone.mode,
      
      // Context for AI understanding
      context: {
        before: quarantineZone.context.before,
        after: quarantineZone.context.after,
        documentTitle: documentMetadata.title || 'Untitled Document',
        documentType: documentMetadata.type || 'general'
      },
      
      // Additional metadata for better AI responses
      metadata: {
        ...quarantineZone.metadata,
        documentLength: this.editor.state.doc.content.size,
        selectionLength: quarantineZone.content.length,
        instructionComplexity: this.assessInstructionComplexity(instruction)
      },
      
      // Quarantine zone ID for position recovery
      quarantineId: quarantineZone.id
    };

    return context;
  }

  /**
   * Extract text before selection with intelligent truncation
   * @param {number} pos - Position to extract before
   * @param {number} maxChars - Maximum characters to extract
   * @returns {string} Context text
   */
  extractContextBefore(pos, maxChars = 500) {
    const startPos = Math.max(0, pos - maxChars);
    
    try {
      let text = this.editor.state.doc.textBetween(startPos, pos, '\n');
      
      // Intelligent truncation - try to start at sentence boundary
      if (startPos > 0) {
        const sentenceStart = this.findSentenceBoundary(text);
        if (sentenceStart > 0) {
          text = '...' + text.substring(sentenceStart);
        }
      }
      
      return text;
    } catch (error) {
      console.error('Error extracting context before:', error);
      return '';
    }
  }

  /**
   * Extract text after selection with intelligent truncation
   * @param {number} pos - Position to extract after
   * @param {number} maxChars - Maximum characters to extract
   * @returns {string} Context text
   */
  extractContextAfter(pos, maxChars = 500) {
    const endPos = Math.min(this.editor.state.doc.content.size, pos + maxChars);
    
    try {
      let text = this.editor.state.doc.textBetween(pos, endPos, '\n');
      
      // Intelligent truncation - try to end at sentence boundary
      if (endPos < this.editor.state.doc.content.size) {
        const sentenceEnd = this.findSentenceEndBoundary(text);
        if (sentenceEnd > 0 && sentenceEnd < text.length) {
          text = text.substring(0, sentenceEnd) + '...';
        }
      }
      
      return text;
    } catch (error) {
      console.error('Error extracting context after:', error);
      return '';
    }
  }

  /**
   * Validate quarantine zone structure
   * @private
   */
  validateQuarantineZone(zone) {
    return zone &&
           zone.boundaries &&
           typeof zone.boundaries.from === 'number' &&
           typeof zone.boundaries.to === 'number' &&
           zone.content !== undefined &&
           zone.context &&
           zone.mode;
  }

  /**
   * Extract document metadata from editor or context
   * @private
   */
  extractDocumentMetadata() {
    // Try to get from editor attributes or state
    const attrs = this.editor.state.doc.attrs || {};
    
    // Try to infer from content
    const firstHeading = this.findFirstHeading();
    
    return {
      title: attrs.title || firstHeading || 'Untitled',
      type: attrs.type || this.inferDocumentType(),
      language: attrs.language || 'en',
      lastModified: attrs.lastModified || new Date().toISOString()
    };
  }

  /**
   * Find the first heading in the document
   * @private
   */
  findFirstHeading() {
    let firstHeading = null;
    
    this.editor.state.doc.descendants((node) => {
      if (!firstHeading && node.type.name === 'heading') {
        firstHeading = node.textContent;
        return false; // Stop iteration
      }
    });
    
    return firstHeading;
  }

  /**
   * Infer document type from content
   * @private
   */
  inferDocumentType() {
    const content = this.editor.state.doc.textContent.toLowerCase();
    
    // Simple heuristics for document type
    if (content.includes('invoice') || content.includes('payment')) {
      return 'invoice';
    } else if (content.includes('proposal') || content.includes('offer')) {
      return 'proposal';
    } else if (content.includes('contract') || content.includes('agreement')) {
      return 'contract';
    } else if (content.includes('report') || content.includes('analysis')) {
      return 'report';
    }
    
    return 'general';
  }

  /**
   * Assess instruction complexity for AI guidance
   * @private
   */
  assessInstructionComplexity(instruction) {
    const complexityIndicators = {
      simple: ['fix', 'correct', 'shorten', 'expand'],
      moderate: ['rewrite', 'clarify', 'improve', 'enhance'],
      complex: ['transform', 'restructure', 'convert', 'analyze and']
    };
    
    const lower = instruction.toLowerCase();
    
    for (const [level, indicators] of Object.entries(complexityIndicators)) {
      if (indicators.some(indicator => lower.includes(indicator))) {
        return level;
      }
    }
    
    return 'simple';
  }

  /**
   * Find sentence boundary in text
   * @private
   */
  findSentenceBoundary(text) {
    // Look for sentence ending followed by space and capital letter
    const sentencePattern = /[.!?]\s+[A-Z]/g;
    const match = sentencePattern.exec(text);
    
    if (match) {
      return match.index + 2; // Position after punctuation and space
    }
    
    // Fallback: look for any sentence ending
    const simpleBoundary = /[.!?]\s/g;
    const simpleMatch = simpleBoundary.exec(text);
    
    return simpleMatch ? simpleMatch.index + 2 : 0;
  }

  /**
   * Find sentence end boundary in text
   * @private
   */
  findSentenceEndBoundary(text) {
    // Look for sentence ending
    const sentencePattern = /[.!?](?:\s|$)/g;
    let lastMatch = null;
    let match;
    
    while ((match = sentencePattern.exec(text)) !== null) {
      if (match.index < text.length * 0.8) { // Don't cut off too much
        lastMatch = match;
      }
    }
    
    return lastMatch ? lastMatch.index + 1 : text.length;
  }

  /**
   * Build context for different editing modes
   * @param {Object} quarantineZone - The quarantine zone
   * @param {string} instruction - User instruction
   * @param {Object} options - Additional options
   * @returns {Object} Mode-specific context
   */
  buildModeSpecificContext(quarantineZone, instruction, options = {}) {
    const baseContext = this.buildContext(quarantineZone, instruction);
    
    switch (quarantineZone.mode) {
      case 'word':
        return this.enhanceWordContext(baseContext, quarantineZone);
      
      case 'sentence':
        return this.enhanceSentenceContext(baseContext, quarantineZone);
      
      case 'paragraph':
        return this.enhanceParagraphContext(baseContext, quarantineZone);
      
      case 'section':
        return this.enhanceSectionContext(baseContext, quarantineZone);
      
      default:
        return baseContext;
    }
  }

  /**
   * Enhance context for word-level edits
   * @private
   */
  enhanceWordContext(context, zone) {
    return {
      ...context,
      wordSpecific: {
        partOfSpeech: this.inferPartOfSpeech(zone.content),
        surroundingWords: this.extractSurroundingWords(zone)
      }
    };
  }

  /**
   * Enhance context for sentence-level edits
   * @private
   */
  enhanceSentenceContext(context, zone) {
    return {
      ...context,
      sentenceSpecific: {
        sentenceType: this.detectSentenceType(zone.content),
        paragraphPosition: this.getSentencePositionInParagraph(zone)
      }
    };
  }

  /**
   * Enhance context for paragraph-level edits
   * @private
   */
  enhanceParagraphContext(context, zone) {
    return {
      ...context,
      paragraphSpecific: {
        paragraphRole: this.inferParagraphRole(zone),
        hasLists: this.containsLists(zone.content),
        hasQuotes: this.containsQuotes(zone.content)
      }
    };
  }

  /**
   * Enhance context for section-level edits
   * @private
   */
  enhanceSectionContext(context, zone) {
    return {
      ...context,
      sectionSpecific: {
        headingLevel: this.getHeadingLevel(zone),
        sectionLength: zone.content.length,
        subsections: this.countSubsections(zone)
      }
    };
  }

  // Utility methods for context enhancement

  inferPartOfSpeech(word) {
    // Simple heuristic - in real implementation might use NLP
    return 'unknown';
  }

  extractSurroundingWords(zone) {
    const words = zone.context.before.split(/\s+/).slice(-3);
    const afterWords = zone.context.after.split(/\s+/).slice(0, 3);
    return {
      before: words,
      after: afterWords
    };
  }

  detectSentenceType(sentence) {
    if (sentence.endsWith('?')) return 'question';
    if (sentence.endsWith('!')) return 'exclamation';
    if (sentence.startsWith('If') || sentence.startsWith('When')) return 'conditional';
    return 'statement';
  }

  getSentencePositionInParagraph(zone) {
    // Simplified - count sentences before this one
    const textBefore = zone.context.before;
    const sentences = textBefore.split(/[.!?]+/).length - 1;
    return sentences;
  }

  inferParagraphRole(zone) {
    const content = zone.content.toLowerCase();
    if (zone.metadata.nodeTypes.includes('heading')) return 'heading';
    if (content.startsWith('in conclusion') || content.startsWith('to summarize')) return 'conclusion';
    if (content.includes('for example') || content.includes('such as')) return 'example';
    if (zone.metadata.paragraphCount === 1) return 'introduction';
    return 'body';
  }

  containsLists(content) {
    return /^[\s]*[-*•]\s/m.test(content) || /^[\s]*\d+\.\s/m.test(content);
  }

  containsQuotes(content) {
    return /".*"/.test(content) || /'.*'/.test(content);
  }

  getHeadingLevel(zone) {
    if (zone.metadata.nodeTypes.includes('heading')) {
      // Extract level from heading node type (e.g., 'heading1' -> 1)
      const match = zone.metadata.nodeTypes[0].match(/heading(\d)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  countSubsections(zone) {
    // Count headings within the section
    let count = 0;
    const lines = zone.content.split('\n');
    lines.forEach(line => {
      if (line.match(/^#+\s/) || line.match(/^={3,}$/) || line.match(/^-{3,}$/)) {
        count++;
      }
    });
    return count;
  }
} 