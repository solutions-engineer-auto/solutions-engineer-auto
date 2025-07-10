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
    
    // Create inline styles to ensure visibility
    const baseStyles = [
      `background-color: ${color}1a`,
      `border-bottom: 2px solid ${color}`,
      'position: relative',
      'padding: 1px 2px',  // Add padding for better visibility
      'cursor: pointer'
    ]
    
    // Add type-specific styles
    if (type === 'deletion') {
      baseStyles.push('text-decoration: line-through')
      baseStyles.push('opacity: 0.8')
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
        style: inlineStyle
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
      markDiff: (from, to, type, changeId, status = 'pending') => ({ commands, editor }) => {
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
                status
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