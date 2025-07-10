/**
 * DiffExtensionV2 - Simplified diff system using marks
 * 
 * This is a complete rewrite that fixes position tracking issues
 * by using TipTap's native mark system instead of decorations.
 */

import { Extension } from '@tiptap/core'
import { DiffMark } from './DiffMark'
import { DiffOverlay } from './DiffOverlay.jsx'
import { ChangeManagerV2 } from '../../services/ChangeManagerV2'

export const DiffExtensionV2 = Extension.create({
  name: 'diffV2',

  addOptions() {
    return {
      onRequestEdit: null,
      onAcceptChange: null,
      onRejectChange: null,
    }
  },

  addExtensions() {
    // Include the DiffMark as a sub-extension
    return [DiffMark]
  },

  addStorage() {
    return {
      changeManager: null,
      overlayManager: null,
      isActive: false
    }
  },

  onCreate() {
    const extension = this
    
    // Initialize managers - Don't pass editor yet, it's not ready!
    this.storage.changeManager = new ChangeManagerV2()
    this.storage.overlayManager = new DiffOverlay()
    
    // Store reference to get current editor
    this.storage.getEditor = () => {
      // Always return the current editor from the extension context
      // This ensures we get the fully initialized editor
      return this.editor
    }
    
    // Inject CSS for diff marks (critical for visibility)
    if (!document.getElementById('diff-mark-styles')) {
      const style = document.createElement('style')
      style.id = 'diff-mark-styles'
      style.textContent = `
        /* Diff mark styles - CRITICAL for visibility */
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
      `
      document.head.appendChild(style)
      console.log('[DiffExtension] CSS styles injected')
    }
    
    // Store helper methods in storage for proper context
    this.storage.updateMarks = () => {
      if (!extension.storage.isActive) return
      
      const changes = extension.storage.changeManager.getChanges()
      const visibleChanges = changes.filter(c => c.status !== 'rejected')
      
      // CRITICAL FIX: Get current editor from storage function
      const currentEditor = extension.storage.getEditor()
      
      // Clear all diff marks first
      currentEditor.commands.command(({ tr, dispatch }) => {
        if (dispatch) {
          tr.removeMark(0, tr.doc.content.size, currentEditor.schema.marks.diffMark)
        }
        return true
      })
      
      // Re-apply marks for visible changes
      visibleChanges.forEach(change => {
        extension.storage.applyMarkForChange(change, currentEditor)
      })
    }
    
    this.storage.applyMarkForChange = (change, passedEditor) => {
      if (!extension.storage.isActive) {
        console.warn('[DiffExtension] Cannot apply mark - diff mode is not active')
        return false
      }
      
      const { from, to } = change.position
      
      // Use passed editor or try to get current one
      const currentEditor = passedEditor || extension.storage.getEditor()
      const docSize = currentEditor.state.doc.content.size
      
      // Validate positions
      if (from < 0 || from > docSize) {
        console.warn(`Invalid change start position: from=${from}, docSize=${docSize}`)
        return false
      }
      
      if (to > docSize) {
        console.warn(`Invalid change end position: to=${to}, docSize=${docSize}`)
        return false
      }
      
      if (from > to) {
        console.warn(`Invalid range: from=${from} > to=${to}`)
        return false
      }
      
      // For additions, from and to are the same
      if (change.type === 'addition' && from !== to) {
        console.warn(`Addition should have from === to, got from=${from}, to=${to}`)
        return false
      }
      
      console.log('[DiffExtension] Applying mark:', {
        changeId: change.id,
        type: change.type,
        from,
        to,
        text: from < to ? currentEditor.state.doc.textBetween(from, to) : '[insertion point]',
        actualDocSize: docSize
      })
      
      // Apply mark using current editor
      try {
        const success = currentEditor.commands.markDiff(
          from,
          to,
          change.type,
          change.id,
          change.status,
          change.originalText,
          change.suggestedText
        )
        
        console.log('[DiffExtension] Mark applied:', success)
        return success
      } catch (error) {
        console.error('[DiffExtension] Error applying mark:', error)
        return false
      }
    }
    
    this.storage.updateMarkStatus = (change, status) => {
      // For now, just update the change status without re-marking
      // The visual update can happen on next refresh
      console.log('[DiffExtension] Mark status updated to:', status, 'for change:', change.id)
      
      // TODO: Implement visual update without position errors
      // This could involve finding the mark in the document and updating its attributes
    }
    
    // Subscribe to change events
    // TEMPORARILY DISABLED: This causes double application of marks
    // We'll handle marks manually in commands for now
    // this.storage.changeManager.subscribe(() => {
    //   extension.storage.updateMarks()
    // })
  },

  onUpdate() {
    // Set editor on overlay manager once it's ready
    if (this.storage.overlayManager && !this.storage.overlayManager.editor) {
      this.storage.overlayManager.setEditor(this.editor)
    }
  },

  onDestroy() {
    // Clean up
    if (this.storage.overlayManager) {
      this.storage.overlayManager.destroy()
    }
  },

  addCommands() {
    // Helper function to find current position of a mark by changeId
    const findMarkPositionById = (editor, changeId) => {
      let found = null;
      
      editor.state.doc.descendants((node, pos) => {
        if (node.isText && !found) {
          const diffMark = node.marks.find(mark => 
            mark.type.name === 'diffMark' && 
            mark.attrs.changeId === changeId
          );
          
          if (diffMark) {
            found = {
              from: pos,
              to: pos + node.nodeSize,
              mark: diffMark,
              text: node.text
            };
            console.log('[findMarkPositionById] Found mark:', {
              changeId,
              oldStoredPosition: '(will be compared later)',
              currentPosition: { from: found.from, to: found.to },
              markedText: found.text,
              markType: diffMark.attrs.type
            });
            return false; // Stop searching
          }
        }
      });
      
      if (!found) {
        console.warn('[findMarkPositionById] Mark not found for changeId:', changeId);
      }
      
      return found;
    };

    return {
      // Enable/disable diff mode
      toggleDiffMode: () => ({ editor }) => {
        this.storage.isActive = !this.storage.isActive
        console.log('[DiffExtension] Diff mode:', this.storage.isActive ? 'ON' : 'OFF')
        
        if (!this.storage.isActive) {
          // Clear all diff marks and changes when disabling
          editor.commands.command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.removeMark(0, tr.doc.content.size, editor.schema.marks.diffMark)
            }
            return true
          })
          this.storage.overlayManager.hideOverlay()
          
          // Clear all changes to prevent stale data
          this.storage.changeManager.clear()
        } else {
          // When enabling, ensure clean state
          const currentEditor = editor
          
          // First clear any existing marks
          currentEditor.commands.command(({ tr, dispatch }) => {
            if (dispatch) {
              tr.removeMark(0, tr.doc.content.size, currentEditor.schema.marks.diffMark)
            }
            return true
          })
          
          // Then re-apply marks for existing changes
          const changes = this.storage.changeManager.getChanges()
          const visibleChanges = changes.filter(c => c.status === 'pending')
          
          visibleChanges.forEach(change => {
            this.storage.applyMarkForChange(change, currentEditor)
          })
        }
        return true
      },

      // Add a single change
      addChange: (change) => ({ editor }) => {
        // First, enable diff mode if not already active
        if (!this.storage.isActive) {
          console.log('[DiffExtension] Auto-enabling diff mode')
          this.storage.isActive = true
        }
        
        const changeId = this.storage.changeManager.addChange(change)
        if (changeId) {
          // Get the complete change object with ID
          const completeChange = this.storage.changeManager.getChange(changeId)
          if (completeChange) {
            // Use the editor from command context for applyMarkForChange
            const currentEditor = editor
            const docSize = currentEditor.state.doc.content.size
            
            // Validate and adjust positions if needed
            let { from, to } = completeChange.position
            
            // Ensure positions are within bounds
            from = Math.max(0, Math.min(from, docSize))
            to = Math.max(from, Math.min(to, docSize))
            
            // Update the change with valid positions
            completeChange.position = { from, to }
            
            // CRITICAL: Update the change in the manager with adjusted positions
            this.storage.changeManager.updateChange(changeId, {
              position: { from, to }
            })
            
            if (from === to && change.type !== 'addition') {
              console.warn(`[addChange] Invalid range for ${change.type}: from=${from}, to=${to}`)
              return false
            }
            
            // Apply mark immediately
            try {
              this.storage.applyMarkForChange(completeChange, currentEditor)
            } catch (error) {
              console.error('[addChange] Error applying mark:', error)
              return false
            }
          }
        }
        return !!changeId
      },

      // Add multiple changes as a batch
      addChangeBatch: (batchId, changes) => () => {
        this.storage.changeManager.addBatch(batchId, changes)
        if (this.storage.isActive) {
          // Apply marks for all changes
          changes.forEach(change => this.storage.applyMarkForChange(change))
        }
        return true
      },

      // Accept a change
      acceptChange: (changeId) => ({ editor }) => {
        const change = this.storage.changeManager.getChange(changeId)
        if (!change) return false
        
        // Store the change data before removing
        const changeData = { ...change }
        
        // Hide the overlay first
        this.storage.overlayManager.hideOverlay()
        
        // POSITION FIX: Look up current mark position instead of using stored position
        const currentMarkPosition = findMarkPositionById(editor, changeId)
        
        if (!currentMarkPosition) {
          console.error('[acceptChange] Could not find mark in document for changeId:', changeId)
          // Remove orphaned change
          this.storage.changeManager.removeChange(changeId)
          return false
        }
        
        // Use current position from mark
        const { from, to } = currentMarkPosition
        const storedFrom = change.position.from
        const storedTo = change.position.to
        
        // Debug: Compare stored vs current positions
        if (from !== storedFrom || to !== storedTo) {
          console.log('[acceptChange] POSITION DRIFT DETECTED:', {
            changeId,
            storedPosition: { from: storedFrom, to: storedTo },
            currentPosition: { from, to },
            drift: { from: from - storedFrom, to: to - storedTo },
            markedText: currentMarkPosition.text
          })
        }
        
        const docSize = editor.state.doc.content.size
        
        // Validate positions are still valid
        if (from < 0 || to > docSize || from > to) {
          console.error('[acceptChange] Invalid positions:', { from, to, docSize })
          // Remove invalid change
          this.storage.changeManager.removeChange(changeId)
          return false
        }
        
        try {
          // Apply the change in a single transaction
          let success = false
          
          if (change.type === 'deletion') {
            success = editor.chain()
              .deleteRange({ from, to })
              .run()
          } else if (change.type === 'addition') {
            success = editor.chain()
              .insertContentAt(from, change.suggestedText)
              .run()
          } else if (change.type === 'modification') {
            // First delete the old content, then insert new
            success = editor.chain()
              .deleteRange({ from, to })
              .insertContentAt(from, change.suggestedText)
              .run()
          }
          
          if (success) {
            // Mark as accepted and remove from manager
            this.storage.changeManager.acceptChange(changeId)
            this.storage.changeManager.removeChange(changeId)
            
            // Update other marks if their positions might have shifted
            const remainingChanges = this.storage.changeManager.getChanges()
            const offset = change.type === 'deletion' 
              ? -(to - from)
              : change.type === 'addition'
              ? change.suggestedText.length
              : change.suggestedText.length - (to - from)
            
            // Adjust positions of changes that come after this one
            remainingChanges.forEach(otherChange => {
              if (otherChange.position.from >= to) {
                // Adjust positions that start at or after the change
                otherChange.position.from += offset
                otherChange.position.to += offset
              } else if (otherChange.position.to > to) {
                // Handle overlapping changes
                otherChange.position.to += offset
              }
            })
            
            // Re-apply marks with updated positions
            if (this.storage.isActive) {
              remainingChanges.forEach(change => {
                try {
                  this.storage.applyMarkForChange(change, editor)
                } catch (err) {
                  console.warn('[acceptChange] Could not re-apply mark:', err)
                }
              })
            }
            
            // Callback
            if (this.options.onAcceptChange) {
              this.options.onAcceptChange(changeData)
            }
            
            return true
          }
        } catch (error) {
          console.error('[acceptChange] Error applying change:', error)
        }
        
        // If we got here, something failed
        this.storage.changeManager.removeChange(changeId)
        return false
      },

      // Reject a change (GitHub/Cursor style - revert the change)
      rejectChange: (changeId) => ({ editor }) => {
        const change = this.storage.changeManager.getChange(changeId)
        if (!change) return false
        
        // Store the change data before removing
        const changeData = { ...change }
        
        // Hide the overlay first
        this.storage.overlayManager.hideOverlay()
        
        // POSITION FIX: Look up current mark position instead of using stored position
        const currentMarkPosition = findMarkPositionById(editor, changeId)
        
        if (!currentMarkPosition) {
          console.error('[rejectChange] Could not find mark in document for changeId:', changeId)
          // Remove orphaned change
          this.storage.changeManager.removeChange(changeId)
          return false
        }
        
        // Use current position from mark
        const { from, to } = currentMarkPosition
        const storedFrom = change.position.from
        const storedTo = change.position.to
        
        // Debug: Compare stored vs current positions
        if (from !== storedFrom || to !== storedTo) {
          console.log('[rejectChange] POSITION DRIFT DETECTED:', {
            changeId,
            storedPosition: { from: storedFrom, to: storedTo },
            currentPosition: { from, to },
            drift: { from: from - storedFrom, to: to - storedTo },
            markedText: currentMarkPosition.text
          })
        }
        
        const docSize = editor.state.doc.content.size
        
        // Validate positions are still valid
        if (from < 0 || to > docSize || from > to) {
          console.error('[rejectChange] Invalid positions:', { from, to, docSize })
          // Remove invalid change
          this.storage.changeManager.removeChange(changeId)
          return false
        }
        
        try {
          // Revert the change based on type
          let success = false
          
          if (change.type === 'deletion') {
            // Restore deleted text
            success = editor.chain()
              .insertContentAt(from, change.originalText)
              .run()
          } else if (change.type === 'addition') {
            // Remove added text
            success = editor.chain()
              .deleteRange({ from, to })
              .run()
          } else if (change.type === 'modification') {
            // Replace suggested text with original
            success = editor.chain()
              .deleteRange({ from, to })
              .insertContentAt(from, change.originalText)
              .run()
          }
          
          if (success) {
            // Mark as rejected and remove from manager
            this.storage.changeManager.rejectChange(changeId)
            this.storage.changeManager.removeChange(changeId)
            
            // Update other marks if their positions might have shifted
            const remainingChanges = this.storage.changeManager.getChanges()
            const offset = change.type === 'deletion' 
              ? change.originalText.length  // Text was restored
              : change.type === 'addition'
              ? -(to - from)  // Text was removed
              : change.originalText.length - (to - from)  // Text was replaced
            
            // Adjust positions of changes that come after this one
            remainingChanges.forEach(otherChange => {
              if (otherChange.position.from >= to) {
                // Adjust positions that start at or after the change
                otherChange.position.from += offset
                otherChange.position.to += offset
                // Update in manager
                this.storage.changeManager.updateChange(otherChange.id, {
                  position: { 
                    from: otherChange.position.from, 
                    to: otherChange.position.to 
                  }
                })
              } else if (otherChange.position.to > to) {
                // Handle overlapping changes
                otherChange.position.to += offset
                this.storage.changeManager.updateChange(otherChange.id, {
                  position: { 
                    from: otherChange.position.from, 
                    to: otherChange.position.to 
                  }
                })
              }
            })
            
            // Re-apply marks with updated positions
            if (this.storage.isActive) {
              // Clear all marks first
              editor.commands.command(({ tr, dispatch }) => {
                if (dispatch) {
                  tr.removeMark(0, tr.doc.content.size, editor.schema.marks.diffMark)
                }
                return true
              })
              
              // Re-apply remaining marks
              remainingChanges.forEach(change => {
                try {
                  this.storage.applyMarkForChange(change, editor)
                } catch (err) {
                  console.warn('[rejectChange] Could not re-apply mark:', err)
                }
              })
            }
            
            // Callback
            if (this.options.onRejectChange) {
              this.options.onRejectChange(changeData)
            }
            
            return true
          }
        } catch (error) {
          console.error('[rejectChange] Error reverting change:', error)
        }
        
        // If we got here, something failed
        this.storage.changeManager.removeChange(changeId)
        return false
      },

      // Apply all accepted changes to the document
      applyAcceptedChanges: () => ({ editor }) => {
        const acceptedChanges = this.storage.changeManager.getChanges({ status: 'accepted' })
        
        // Sort by position (reverse order to maintain positions)
        acceptedChanges.sort((a, b) => b.position.from - a.position.from)
        
        // Apply each change
        editor.commands.command(({ tr, dispatch }) => {
          if (dispatch) {
            acceptedChanges.forEach(change => {
              if (change.type === 'deletion') {
                tr.delete(change.position.from, change.position.to)
              } else if (change.type === 'addition') {
                tr.insertText(change.suggestedText, change.position.from)
              } else if (change.type === 'modification') {
                tr.replaceWith(
                  change.position.from,
                  change.position.to,
                  editor.schema.text(change.suggestedText)
                )
              }
            })
          }
          return true
        })
        
        // Clear applied changes
        acceptedChanges.forEach(change => {
          this.storage.changeManager.removeChange(change.id)
        })
        
        return true
      },

      // Accept all pending changes
      acceptAllChanges: () => ({ editor }) => {
        const pendingChanges = this.storage.changeManager.getChanges({ status: 'pending' })
        pendingChanges.forEach(change => {
          editor.commands.acceptChange(change.id)
        })
        return true
      },

      // Reject all pending changes
      rejectAllChanges: () => ({ editor }) => {
        const pendingChanges = this.storage.changeManager.getChanges({ status: 'pending' })
        pendingChanges.forEach(change => {
          editor.commands.rejectChange(change.id)
        })
        return true
      }
    }
  },

  addKeyboardShortcuts() {
    return {
      // Toggle diff mode
      'Mod-d': () => {
        this.editor.commands.toggleDiffMode()
        return true
      },
      
      // Request AI edit
      'Mod-k': () => {
        const { selection } = this.editor.state
        if (!selection.empty && this.options.onRequestEdit) {
          const text = this.editor.state.doc.textBetween(selection.from, selection.to)
          this.options.onRequestEdit({
            selection: {
              from: selection.from,
              to: selection.to,
              text
            }
          })
        }
        return true
      }
    }
  }
})

// Helper function to create the extension
export function createDiffExtensionV2(options = {}) {
  return DiffExtensionV2.configure(options)
} 