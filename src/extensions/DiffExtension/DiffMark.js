/**
 * DiffMark - TipTap mark for diff highlighting
 * 
 * This replaces the broken decoration system with TipTap's native mark system.
 * Marks are like bold/italic - they work reliably with positions!
 */

import { Mark, mergeAttributes } from '@tiptap/core'

export const DiffMark = Mark.create({
  name: 'diffMark',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      // Type of change
      type: {
        default: 'addition',
        parseHTML: element => element.getAttribute('data-diff-type'),
        renderHTML: attributes => {
          return {
            'data-diff-type': attributes.type,
          }
        },
      },
      // Unique change ID
      changeId: {
        default: null,
        parseHTML: element => element.getAttribute('data-change-id'),
        renderHTML: attributes => {
          if (!attributes.changeId) return {}
          return {
            'data-change-id': attributes.changeId,
          }
        },
      },
      // Status of the change
      status: {
        default: 'pending',
        parseHTML: element => element.getAttribute('data-status'),
        renderHTML: attributes => {
          return {
            'data-status': attributes.status,
          }
        },
      },
      // Original text (for undo support)
      originalText: {
        default: null,
        parseHTML: element => element.getAttribute('data-original-text'),
        renderHTML: attributes => {
          if (!attributes.originalText) return {}
          return {
            'data-original-text': attributes.originalText,
          }
        },
      },
      // Suggested text (for undo support)
      suggestedText: {
        default: null,
        parseHTML: element => element.getAttribute('data-suggested-text'),
        renderHTML: attributes => {
          if (!attributes.suggestedText) return {}
          return {
            'data-suggested-text': attributes.suggestedText,
          }
        },
      },
      // Color for the highlight
      color: {
        default: null,
        parseHTML: element => element.style.backgroundColor,
        renderHTML: attributes => {
          if (!attributes.color) return {}
          return {
            style: `background-color: ${attributes.color}`,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-type]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    // Determine color based on type
    const colors = {
      addition: '#10b981',      // Green
      deletion: '#ef4444',      // Red  
      modification: '#06b6d4'   // Cyan
    }
    
    const type = HTMLAttributes['data-diff-type'] || HTMLAttributes.type || 'addition'
    const color = colors[type] || colors.addition
    
    // Build class name
    const classes = [
      'diff-mark',
      `diff-${type}`,
      HTMLAttributes['data-status'] === 'accepted' ? 'diff-accepted' : ''
    ].filter(Boolean).join(' ')
    
    // Create inline styles that show these are SUGGESTIONS
    const baseStyles = [
      `background-color: ${color}1a`,
      `border: 2px solid ${color}`,  // Solid border as requested
      'position: relative',
      'padding: 2px 4px',
      'cursor: pointer',
      'border-radius: 3px',
      'transition: all 0.2s ease'
    ]
    
    // Add type-specific styles
    if (type === 'deletion') {
      // Don't strike through - just show it would be deleted
      baseStyles.push(`background-color: ${color}20`)
      baseStyles.push('opacity: 0.7')
    } else if (type === 'addition') {
      // Show what would be added with a different style
      baseStyles.push(`background-color: ${color}15`)
    } else if (type === 'modification') {
      // Show it would be modified
      baseStyles.push(`background-color: ${color}15`)
    }
    
    const inlineStyle = baseStyles.join('; ')
    
    console.log('[DiffMark] Rendering mark:', {
      type,
      HTMLAttributes,
      classes,
      style: inlineStyle
    })
    
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        class: classes,
        style: inlineStyle,
        title: `Suggested ${type} - Click to accept/reject`
      }),
      0
    ]
  },

  // Commands to manipulate diff marks
  addCommands() {
    return {
      setDiffMark: (attributes) => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      
      toggleDiffMark: (attributes) => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      
      unsetDiffMark: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
      
      // Helper to mark a specific range
      markDiff: (from, to, type, changeId, status = 'pending', originalText = null, suggestedText = null) => ({ commands, editor }) => {
        // Validate positions first
        const docSize = editor.state.doc.content.size
        if (from < 0 || to > docSize) {
          console.warn(`[markDiff] Invalid positions: from=${from}, to=${to}, docSize=${docSize}`)
          return false
        }
        
        // For additions at a point (from === to), skip for now
        if (type === 'addition' && from === to) {
          console.warn(`[markDiff] Skipping addition mark at position ${from} - additions need different handling`)
          return true // Return true to not break the flow
        }
        
        // Normal range marking for modifications and deletions
        if (from > to) {
          console.warn(`[markDiff] Invalid range: from=${from} > to=${to}`)
          return false
        }
        
        // Use chain to ensure proper execution
        return commands.command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.addMark(
              from,
              to,
              editor.schema.marks.diffMark.create({
                type,
                changeId,
                status,
                originalText,
                suggestedText
              })
            )
          }
          return true
        })
      },
      
      // Remove diff mark from a range
      unmarkDiff: (from, to) => ({ commands, editor }) => {
        // Validate positions first
        const docSize = editor.state.doc.content.size
        if (from < 0 || to > docSize || from > to) {
          console.warn(`[unmarkDiff] Invalid positions: from=${from}, to=${to}, docSize=${docSize}`)
          return false
        }
        
        return commands.command(({ tr, dispatch }) => {
          if (dispatch) {
            tr.removeMark(from, to, editor.schema.marks.diffMark)
          }
          return true
        })
      }
    }
  }
})

// Helper function to create the mark
export function createDiffMark(options = {}) {
  return DiffMark.configure(options)
} 