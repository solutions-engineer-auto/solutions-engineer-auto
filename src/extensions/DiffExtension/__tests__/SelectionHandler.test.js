/* eslint-env jest */

/**
 * Tests for SelectionHandler
 * 
 * These tests focus on ensuring robust position tracking that prevents
 * the offset errors that can occur when documents are modified.
 */

import { SelectionHandler } from '../SelectionHandler'

// Mock editor for testing
const createMockEditor = (content, selectionFrom = 0, selectionTo = 10) => {
  const mockDoc = {
    content: { size: content.length },
    textContent: content,
    textBetween: (from, to, separator = '') => {
      if (from < 0 || to > content.length) {
        throw new Error('Position out of bounds')
      }
      return content.substring(from, to).replace(/\n/g, separator || '\n')
    },
    nodesBetween: (from, to, callback) => {
      // Simulate paragraph nodes
      const text = content.substring(from, to)
      const paragraphs = text.split('\n').filter(p => p.length > 0)
      paragraphs.forEach((p, i) => {
        callback({ type: { name: 'paragraph' }, textContent: p })
      })
    },
    descendants: (callback) => {
      // Simulate document structure
      const lines = content.split('\n')
      lines.forEach((line, i) => {
        if (line.startsWith('# ')) {
          callback({ type: { name: 'heading' }, textContent: line.substring(2) })
        }
      })
    }
  }

  const mockSelection = {
    from: selectionFrom,
    to: selectionTo,
    empty: selectionFrom === selectionTo,
    $from: {
      pos: selectionFrom,
      parentOffset: selectionFrom % 50, // Simulate offset within paragraph
      depth: 1,
      parent: { type: { name: 'paragraph' } },
      node: (depth) => {
        if (depth === 0) return mockDoc
        if (depth === 1) return { type: { name: 'paragraph' } }
        return null
      },
      start: (depth) => {
        // Find start of paragraph containing this position
        const beforeText = content.substring(0, selectionFrom)
        const lastNewline = beforeText.lastIndexOf('\n')
        return lastNewline === -1 ? 0 : lastNewline + 1
      },
      end: () => {
        // Find end of paragraph containing this position
        const afterNewline = content.indexOf('\n', selectionFrom)
        return afterNewline === -1 ? content.length : afterNewline
      },
      path: [0, 0, selectionFrom]
    },
    $to: {
      pos: selectionTo,
      parentOffset: selectionTo % 50,
      depth: 1,
      parent: { type: { name: 'paragraph' } },
      node: (depth) => {
        if (depth === 0) return mockDoc
        if (depth === 1) return { type: { name: 'paragraph' } }
        return null
      },
      start: (depth) => {
        const beforeText = content.substring(0, selectionTo)
        const lastNewline = beforeText.lastIndexOf('\n')
        return lastNewline === -1 ? 0 : lastNewline + 1
      },
      end: () => {
        const afterNewline = content.indexOf('\n', selectionTo)
        return afterNewline === -1 ? content.length : afterNewline
      },
      path: [0, 0, selectionTo]
    }
  }

  return {
    state: {
      doc: mockDoc,
      selection: mockSelection
    }
  }
}

describe('SelectionHandler', () => {
  describe('Paragraph Selection', () => {
    test('should extract single paragraph correctly', () => {
      const content = 'First paragraph.\nSecond paragraph.\nThird paragraph.'
      const editor = createMockEditor(content, 0, 15)
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      
      expect(zone).toBeDefined()
      expect(zone.content).toBe('First paragraph.')
      expect(zone.mode).toBe('paragraph')
      expect(zone.boundaries.from).toBe(0)
      expect(zone.boundaries.to).toBe(16) // Including the newline
    })

    test('should handle selection spanning multiple paragraphs', () => {
      const content = 'First paragraph.\nSecond paragraph.\nThird paragraph.'
      const editor = createMockEditor(content, 10, 25)
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      
      expect(zone).toBeDefined()
      expect(zone.content).toContain('First paragraph')
      expect(zone.content).toContain('Second paragraph')
      expect(zone.metadata.spanning).toBe(true)
    })

    test('should extract correct context before and after', () => {
      const content = 'This is the context before. Selected paragraph here. This is the context after the selection.'
      const editor = createMockEditor(content, 28, 52)
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      
      expect(zone.context.before).toContain('context before')
      expect(zone.context.after).toContain('context after')
    })
  })

  describe('Position Tracking and Recovery', () => {
    test('should create stable anchors with content hash', () => {
      const content = 'Test paragraph for anchor creation.'
      const editor = createMockEditor(content, 0, 34)
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      
      expect(zone.id).toMatch(/^anchor_\d+$/)
      expect(handler.positionMap.has(zone.id)).toBe(true)
      
      const anchor = handler.positionMap.get(zone.id)
      expect(anchor.contentHash).toBeDefined()
      expect(anchor.surroundingContent).toBeDefined()
    })

    test('should recover position when content unchanged', () => {
      const content = 'Paragraph one.\nTarget paragraph.\nParagraph three.'
      const editor = createMockEditor(content, 15, 31)
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      const anchorId = zone.id
      
      // Simulate position recovery
      const recovered = handler.recoverPosition(anchorId)
      
      expect(recovered).toBeDefined()
      expect(recovered.from).toBe(15)
      expect(recovered.to).toBe(31)
    })

    test('should handle position recovery after content change', () => {
      const originalContent = 'Before text. Target paragraph. After text.'
      const editor = createMockEditor(originalContent, 13, 29)
      const handler = new SelectionHandler(editor)
      
      // Create initial anchor
      const zone = handler.getQuarantineZone('paragraph')
      const anchorId = zone.id
      
      // Simulate content change before the target
      const modifiedContent = 'Modified before text. Target paragraph. After text.'
      editor.state.doc.textContent = modifiedContent
      editor.state.doc.content.size = modifiedContent.length
      
      // Mock the textBetween function for the new content
      editor.state.doc.textBetween = (from, to) => {
        return modifiedContent.substring(from, to)
      }
      
      // Attempt recovery with fuzzy matching
      const recovered = handler.recoverPosition(anchorId)
      
      // Should find the target paragraph at new position
      expect(recovered).toBeDefined()
      expect(recovered.recovered).toBe(true)
    })

    test('should clean up old anchors', () => {
      const content = 'Test content for cleanup.'
      const editor = createMockEditor(content, 0, 12)
      const handler = new SelectionHandler(editor)
      
      // Create multiple anchors
      const zone1 = handler.getQuarantineZone('paragraph')
      const zone2 = handler.getQuarantineZone('paragraph')
      
      expect(handler.positionMap.size).toBe(2)
      
      // Clean up with 0 max age (remove all)
      handler.cleanupAnchors(0)
      
      expect(handler.positionMap.size).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    test('should handle empty selection', () => {
      const content = 'Some content here.'
      const editor = createMockEditor(content, 5, 5) // Empty selection
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      
      // Should still extract the containing paragraph
      expect(zone).toBeDefined()
      expect(zone.content).toBe('Some content here.')
    })

    test('should handle selection at document boundaries', () => {
      const content = 'First line.\nLast line.'
      const editor = createMockEditor(content, 0, 11)
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      
      expect(zone).toBeDefined()
      expect(zone.boundaries.from).toBe(0)
      expect(zone.context.before).toBe('')
    })

    test('should handle special characters in content', () => {
      const content = 'Paragraph with "quotes" and special chars: <>&.'
      const editor = createMockEditor(content, 0, 47)
      const handler = new SelectionHandler(editor)
      
      const zone = handler.getQuarantineZone('paragraph')
      
      expect(zone).toBeDefined()
      expect(zone.content).toContain('"quotes"')
      expect(zone.content).toContain('<>&')
    })

    test('should throw error for invalid selection', () => {
      const content = 'Test content'
      const editor = createMockEditor(content, 0, 12)
      const handler = new SelectionHandler(editor)
      
      // Mock invalid paragraph depth
      editor.state.selection.$from.depth = 0
      editor.state.selection.$to.depth = 0
      handler.findParagraphDepth = () => -1
      
      expect(() => handler.getQuarantineZone('paragraph')).toThrow('Selection is not within paragraphs')
    })

    test('should handle very long documents efficiently', () => {
      // Create a large document
      const paragraphs = Array(100).fill('This is a test paragraph with some content.').join('\n')
      const editor = createMockEditor(paragraphs, 1000, 1043)
      const handler = new SelectionHandler(editor)
      
      const startTime = Date.now()
      const zone = handler.getQuarantineZone('paragraph')
      const duration = Date.now() - startTime
      
      expect(zone).toBeDefined()
      expect(duration).toBeLessThan(100) // Should complete quickly
    })
  })

  describe('Mode Fallbacks', () => {
    test('should fall back to paragraph for unimplemented modes', () => {
      const content = 'Test content for fallback.'
      const editor = createMockEditor(content, 0, 12)
      const handler = new SelectionHandler(editor)
      
      // Spy on console.warn
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      
      const wordZone = handler.getQuarantineZone('word')
      const sentenceZone = handler.getQuarantineZone('sentence')
      const sectionZone = handler.getQuarantineZone('section')
      
      expect(wordZone.mode).toBe('paragraph')
      expect(sentenceZone.mode).toBe('paragraph')
      expect(sectionZone.mode).toBe('paragraph')
      
      expect(warnSpy).toHaveBeenCalledTimes(3)
      
      warnSpy.mockRestore()
    })
  })
}) 