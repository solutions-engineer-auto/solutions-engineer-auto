/**
 * DiffExtensionV1 - Original Phase 1 implementation
 * 
 * This is the foundational implementation that provides:
 * - Text selection handling with quarantine zones
 * - Position tracking that survives document changes
 * - Context extraction for AI requests
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { SelectionHandler } from './SelectionHandler'
import { ContextBuilder } from '../../services/contextBuilder'

export const DiffExtensionV1 = Extension.create({
  name: 'diff',

  // Extension options
  addOptions() {
    return {
      // Callback when AI edit is requested
      onRequestEdit: null,
      
      // Callback when change is accepted
      onAcceptChange: null,
      
      // Callback when change is rejected
      onRejectChange: null,
      
      // Change manager instance (will be used in future phases)
      changeManager: null,
      
      // Enable keyboard shortcuts
      enableKeyboardShortcuts: true,
      
      // Default selection mode
      defaultMode: 'paragraph'
    }
  },

  // Storage for extension state
  addStorage() {
    return {
      // Selection handler instance
      selectionHandler: null,
      
      // Context builder instance
      contextBuilder: null,
      
      // Current quarantine zone
      currentQuarantine: null,
      
      // Active changes (for future phases)
      activeChanges: new Map(),
      
      // Position tracking
      trackedPositions: new Map()
    }
  },

  // Keyboard shortcuts
  addKeyboardShortcuts() {
    if (!this.options.enableKeyboardShortcuts) return {}

    return {
      // Cmd/Ctrl + K: Request AI edit
      'Mod-k': () => {
        const { state } = this.editor
        const { selection } = state
        
        // Check if there's a selection
        if (selection.empty) {
          console.warn('No text selected for AI edit')
          return false
        }
        
        // Get quarantine zone
        try {
          const quarantine = this.storage.selectionHandler.getQuarantineZone(
            this.options.defaultMode
          )
          
          // Store current quarantine
          this.storage.currentQuarantine = quarantine
          
          // Trigger the edit request callback
          if (this.options.onRequestEdit) {
            this.options.onRequestEdit({
              quarantine,
              editor: this.editor
            })
          }
          
          return true
        } catch (error) {
          console.error('Failed to create quarantine zone:', error)
          return false
        }
      },
      
      // Tab: Accept focused change (for future phases)
      'Tab': () => {
        // TODO: Implement in Phase 2
        return false
      },
      
      // Shift-Tab: Reject focused change (for future phases)
      'Shift-Tab': () => {
        // TODO: Implement in Phase 2
        return false
      }
    }
  },

  // Commands for programmatic control
  addCommands() {
    return {
      // Request AI edit for current selection
      requestAIEdit: (mode = 'paragraph') => ({ state }) => {
        const { selection } = state
        
        if (selection.empty) {
          console.warn('Cannot request AI edit without selection')
          return false
        }
        
        try {
          const quarantine = this.storage.selectionHandler.getQuarantineZone(mode)
          this.storage.currentQuarantine = quarantine
          
          if (this.options.onRequestEdit) {
            this.options.onRequestEdit({
              quarantine,
              editor: this.editor
            })
          }
          
          return true
        } catch (error) {
          console.error('Failed to request AI edit:', error)
          return false
        }
      },
      
      // Get current quarantine zone
      getQuarantineZone: (mode) => () => {
        try {
          return this.storage.selectionHandler.getQuarantineZone(
            mode || this.options.defaultMode
          )
        } catch (error) {
          console.error('Failed to get quarantine zone:', error)
          return null
        }
      },
      
      // Build context for AI request
      buildAIContext: (instruction) => () => {
        if (!this.storage.currentQuarantine) {
          console.warn('No quarantine zone available')
          return null
        }
        
        try {
          return this.storage.contextBuilder.buildContext(
            this.storage.currentQuarantine,
            instruction
          )
        } catch (error) {
          console.error('Failed to build AI context:', error)
          return null
        }
      }
    }
  },

  // ProseMirror plugins
  addProseMirrorPlugins() {
    const pluginKey = new PluginKey('diff')
    
    return [
      new Plugin({
        key: pluginKey,
        
        // Initialize state
        state: {
          init: () => {
            return {
              // Track document changes for position mapping
              documentVersion: 0,
              
              // Store transaction mappings for position recovery
              mappings: []
            }
          },
          
          // Apply transactions
          // eslint-disable-next-line no-unused-vars
          apply: (tr, value, oldState, newState) => {
            // Track document changes
            if (tr.docChanged) {
              value.documentVersion++
              value.mappings.push(tr.mapping)
              
              // Limit mapping history to prevent memory issues
              if (value.mappings.length > 100) {
                value.mappings = value.mappings.slice(-50)
              }
            }
            
            return value
          }
        },
        
        // View layer (for future diff visualization)
        view: () => {
          return {
            update: () => {
              // TODO: Update diff decorations in Phase 2
            },
            
            destroy: () => {
              // Cleanup
              if (this.storage.selectionHandler) {
                this.storage.selectionHandler.cleanupAnchors()
              }
            }
          }
        },
        
        // Props for handling events
        props: {
          // Handle clicks on diff widgets (future)
          handleClick: (view, pos, event) => {
            // TODO: Implement in Phase 2
            return false
          },
          
          // Decorations for diff visualization (future)
          decorations: (state) => {
            // TODO: Implement in Phase 2
            return null
          }
        }
      })
    ]
  },

  // Extension lifecycle
  onCreate() {
    // Initialize selection handler
    this.storage.selectionHandler = new SelectionHandler(this.editor)
    
    // Initialize context builder
    this.storage.contextBuilder = new ContextBuilder(this.editor)
    
    console.log('DiffExtension V1 initialized')
  },

  onUpdate() {
    // Clean up old position anchors periodically
    if (this.storage.selectionHandler) {
      this.storage.selectionHandler.cleanupAnchors()
    }
  },

  onDestroy() {
    // Cleanup
    this.storage.selectionHandler = null
    this.storage.contextBuilder = null
    this.storage.currentQuarantine = null
    this.storage.activeChanges.clear()
    this.storage.trackedPositions.clear()
  }
}) 