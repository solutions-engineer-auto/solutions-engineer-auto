/* eslint-env jest */

/**
 * Tests for ContextBuilder
 * 
 * These tests ensure that context is properly extracted and formatted
 * for AI API requests, with proper quarantine zone boundaries.
 */

import { ContextBuilder } from '../contextBuilder'

// Mock editor similar to SelectionHandler tests
const createMockEditor = (content) => {
  return {
    state: {
      doc: {
        content: { size: content.length },
        textContent: content,
        attrs: {},
        textBetween: (from, to, separator = '') => {
          if (from < 0 || to > content.length) {
            throw new Error('Position out of bounds')
          }
          return content.substring(from, to).replace(/\n/g, separator || '\n')
        },
        descendants: (callback) => {
          // Simulate document structure
          const lines = content.split('\n')
          lines.forEach((line) => {
            if (line.startsWith('# ')) {
              callback({ 
                type: { name: 'heading' }, 
                textContent: line.substring(2) 
              })
              return false // First heading only
            }
          })
        }
      }
    }
  }
}

// Mock quarantine zone from SelectionHandler
const createMockQuarantineZone = (content, from, to, mode = 'paragraph') => {
  return {
    id: 'anchor_test_123',
    mode,
    boundaries: { from, to, relativeFrom: 0, relativeTo: to - from },
    content,
    context: {
      before: 'This is the context before the selection. ',
      after: ' This is the context after the selection.'
    },
    metadata: {
      nodeTypes: ['paragraph'],
      spanning: false,
      paragraphCount: 1
    },
    path: {
      from: [0, 0, from],
      to: [0, 0, to]
    }
  }
}

describe('ContextBuilder', () => {
  describe('Context Building', () => {
    test('should build basic context from quarantine zone', () => {
      const content = 'This is the selected paragraph content.'
      const editor = createMockEditor(content)
      const builder = new ContextBuilder(editor)
      const zone = createMockQuarantineZone(content, 0, content.length)
      
      const context = builder.buildContext(zone, 'Make this more concise')
      
      expect(context).toBeDefined()
      expect(context.selection.text).toBe(content)
      expect(context.instruction).toBe('Make this more concise')
      expect(context.mode).toBe('paragraph')
      expect(context.quarantineId).toBe('anchor_test_123')
    })

    test('should include document metadata', () => {
      const content = '# Document Title\nThis is the content.'
      const editor = createMockEditor(content)
      const builder = new ContextBuilder(editor)
      const zone = createMockQuarantineZone('This is the content.', 17, 37)
      
      const context = builder.buildContext(zone, 'Edit this')
      
      expect(context.context.documentTitle).toBe('Document Title')
      expect(context.metadata.documentLength).toBe(content.length)
    })

    test('should assess instruction complexity', () => {
      const editor = createMockEditor('Test content')
      const builder = new ContextBuilder(editor)
      const zone = createMockQuarantineZone('Test', 0, 4)
      
      // Test different complexity levels
      const simpleContext = builder.buildContext(zone, 'Fix the typo')
      const moderateContext = builder.buildContext(zone, 'Rewrite this section')
      const complexContext = builder.buildContext(zone, 'Transform this into a bulleted list')
      
      expect(simpleContext.metadata.instructionComplexity).toBe('simple')
      expect(moderateContext.metadata.instructionComplexity).toBe('moderate')
      expect(complexContext.metadata.instructionComplexity).toBe('complex')
    })

    test('should validate quarantine zone', () => {
      const editor = createMockEditor('Test')
      const builder = new ContextBuilder(editor)
      
      // Invalid zone
      const invalidZone = { content: 'test' }
      
      expect(() => builder.buildContext(invalidZone, 'Edit')).toThrow('Invalid quarantine zone')
    })
  })

  describe('Context Extraction', () => {
    test('should extract context with intelligent truncation', () => {
      const longContent = 'This is a very long document. ' + 
                         'Here is a sentence that ends. ' +
                         'Target content here. ' +
                         'Another sentence follows. ' +
                         'And more content after that.'
      
      const editor = createMockEditor(longContent)
      const builder = new ContextBuilder(editor)
      
      const beforeContext = builder.extractContextBefore(50, 100)
      const afterContext = builder.extractContextAfter(70, 100)
      
      // Should truncate at sentence boundaries
      expect(beforeContext).toMatch(/^\.\.\./)
      expect(afterContext).toMatch(/\.\.\.$/)
    })

    test('should handle context at document boundaries', () => {
      const content = 'Start of document. End of document.'
      const editor = createMockEditor(content)
      const builder = new ContextBuilder(editor)
      
      const beforeStart = builder.extractContextBefore(0)
      const afterEnd = builder.extractContextAfter(content.length)
      
      expect(beforeStart).toBe('')
      expect(afterEnd).toBe('')
    })

    test('should handle context extraction errors gracefully', () => {
      const editor = createMockEditor('Test content')
      const builder = new ContextBuilder(editor)
      
      // Mock error in textBetween
      editor.state.doc.textBetween = () => {
        throw new Error('Test error')
      }
      
      const before = builder.extractContextBefore(5)
      const after = builder.extractContextAfter(5)
      
      expect(before).toBe('')
      expect(after).toBe('')
    })
  })

  describe('Document Type Inference', () => {
    test('should infer document type from content', () => {
      const editor = createMockEditor('Test')
      const builder = new ContextBuilder(editor)
      
      // Test different document types
      const invoiceEditor = createMockEditor('Invoice #123\nPayment due: $500')
      const proposalEditor = createMockEditor('Business Proposal\nWe offer the following...')
      const contractEditor = createMockEditor('Service Agreement\nThis contract is between...')
      const reportEditor = createMockEditor('Annual Report\nAnalysis of performance...')
      
      expect(new ContextBuilder(invoiceEditor).inferDocumentType()).toBe('invoice')
      expect(new ContextBuilder(proposalEditor).inferDocumentType()).toBe('proposal')
      expect(new ContextBuilder(contractEditor).inferDocumentType()).toBe('contract')
      expect(new ContextBuilder(reportEditor).inferDocumentType()).toBe('report')
      expect(builder.inferDocumentType()).toBe('general')
    })
  })

  describe('Mode-Specific Context', () => {
    test('should enhance context for paragraph mode', () => {
      const content = '- List item 1\n- List item 2\n"Quote here"'
      const editor = createMockEditor(content)
      const builder = new ContextBuilder(editor)
      const zone = createMockQuarantineZone(content, 0, content.length, 'paragraph')
      
      const context = builder.buildModeSpecificContext(zone, 'Edit this')
      
      expect(context.paragraphSpecific).toBeDefined()
      expect(context.paragraphSpecific.hasLists).toBe(true)
      expect(context.paragraphSpecific.hasQuotes).toBe(true)
    })

    test('should detect paragraph roles', () => {
      const editor = createMockEditor('Test')
      const builder = new ContextBuilder(editor)
      
      // Test different paragraph roles
      const conclusionZone = createMockQuarantineZone('In conclusion, we have shown...', 0, 30)
      const exampleZone = createMockQuarantineZone('For example, consider this case...', 0, 33)
      
      const conclusionContext = builder.buildModeSpecificContext(conclusionZone, 'Edit')
      const exampleContext = builder.buildModeSpecificContext(exampleZone, 'Edit')
      
      expect(conclusionContext.paragraphSpecific.paragraphRole).toBe('conclusion')
      expect(exampleContext.paragraphSpecific.paragraphRole).toBe('example')
    })
  })

  describe('Utility Methods', () => {
    test('should find sentence boundaries correctly', () => {
      const editor = createMockEditor('Test')
      const builder = new ContextBuilder(editor)
      
      const text1 = 'First sentence. Second sentence starts here.'
      const boundary1 = builder.findSentenceBoundary(text1)
      expect(boundary1).toBe(16) // After ". "
      
      const text2 = 'Question here? Answer follows.'
      const boundary2 = builder.findSentenceBoundary(text2)
      expect(boundary2).toBe(15) // After "? "
    })

    test('should detect sentence types', () => {
      const editor = createMockEditor('Test')
      const builder = new ContextBuilder(editor)
      
      expect(builder.detectSentenceType('Is this a question?')).toBe('question')
      expect(builder.detectSentenceType('What an exclamation!')).toBe('exclamation')
      expect(builder.detectSentenceType('If this happens...')).toBe('conditional')
      expect(builder.detectSentenceType('This is a statement.')).toBe('statement')
    })

    test('should detect lists in content', () => {
      const editor = createMockEditor('Test')
      const builder = new ContextBuilder(editor)
      
      expect(builder.containsLists('- Item 1\n- Item 2')).toBe(true)
      expect(builder.containsLists('* Bullet point')).toBe(true)
      expect(builder.containsLists('1. Numbered item')).toBe(true)
      expect(builder.containsLists('No lists here')).toBe(false)
    })
  })
}) 