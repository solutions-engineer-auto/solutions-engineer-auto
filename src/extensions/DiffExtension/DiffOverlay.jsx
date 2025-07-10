/**
 * DiffOverlay - Manages interactive overlays for diff changes
 * 
 * Since marks can't be interactive, we use overlays positioned
 * over the marked text for accept/reject buttons.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

export class DiffOverlay {
  constructor() {
    this.editor = null  // Will be set later
    this.overlays = new Map()
    this.overlayRoots = new Map() // Store React roots for cleanup
    this.portalContainer = null
    this.activeChangeId = null
    this.scrollParent = null
    this.updateHandler = null
    this.initialized = false
  }
  
  setEditor(editor) {
    this.editor = editor
    if (!this.initialized) {
      this.init()
      this.initialized = true
    }
  }

  init() {
    if (!this.editor) {
      console.warn('[DiffOverlay] Cannot initialize without editor')
      return
    }
    
    // Create portal container for overlays at document body level
    this.portalContainer = document.createElement('div')
    this.portalContainer.id = 'diff-overlay-portal'
    this.portalContainer.style.position = 'fixed'
    this.portalContainer.style.top = '0'
    this.portalContainer.style.left = '0'
    this.portalContainer.style.width = '0'
    this.portalContainer.style.height = '0'
    this.portalContainer.style.pointerEvents = 'none'
    this.portalContainer.style.zIndex = '10000'
    document.body.appendChild(this.portalContainer)
    
    // Find scrollable parent
    this.scrollParent = this.findScrollParent(this.editor.view.dom)
    
    // Create update handler
    this.updateHandler = this.debounce(() => this.updatePositions(), 16)
    
    // Listen for editor updates
    this.editor.on('update', this.updateHandler)
    this.editor.on('selectionUpdate', this.updateHandler)
    
    // Listen for clicks on marked text with proper event handling
    this.handleClick = this.handleClick.bind(this)
    this.editor.view.dom.addEventListener('mousedown', this.handleClick)
    
    // Listen for scroll and resize
    if (this.scrollParent) {
      this.scrollParent.addEventListener('scroll', this.updateHandler, { passive: true })
    }
    window.addEventListener('resize', this.updateHandler, { passive: true })
    
    // Hide overlay on outside clicks
    this.handleOutsideClick = this.handleOutsideClick.bind(this)
    document.addEventListener('mousedown', this.handleOutsideClick)

    // Inject styles when the module loads
    const DIFF_OVERLAY_STYLES = `
      .diff-overlay-container {
        pointer-events: none;
      }
      
      .diff-overlay {
        background: linear-gradient(135deg, rgba(10, 15, 30, 0.98) 0%, rgba(5, 7, 12, 0.98) 100%);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 0;
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.6),
          0 0 0 1px rgba(255, 255, 255, 0.1) inset;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        min-width: 300px;
      }
      
      .diff-overlay-header {
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        font-size: 13px;
        font-weight: 600;
        color: rgba(255, 255, 255, 0.9);
        text-align: center;
      }
      
      .diff-overlay-changes {
        padding: 12px 16px;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        line-height: 1.5;
      }
      
      .diff-change-preview {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      
      .diff-change-del {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.1);
        padding: 4px 8px;
        border-radius: 4px;
        display: block;
      }
      
      .diff-change-add {
        color: #22c55e;
        background: rgba(34, 197, 94, 0.1);
        padding: 4px 8px;
        border-radius: 4px;
        display: block;
      }
      
      .diff-overlay-content {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .diff-overlay-btn {
        flex: 1;
        padding: 8px 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        outline: none;
      }
      
      .diff-overlay-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      
      .diff-overlay-btn:active {
        transform: translateY(0);
      }
      
      .diff-overlay-btn.diff-accept {
        border-color: rgba(34, 197, 94, 0.5);
        background: rgba(34, 197, 94, 0.2);
      }
      
      .diff-overlay-btn.diff-accept:hover {
        background: rgba(34, 197, 94, 0.3);
        border-color: rgba(34, 197, 94, 0.8);
        color: #86efac;
      }
      
      .diff-overlay-btn.diff-reject {
        border-color: rgba(239, 68, 68, 0.5);
        background: rgba(239, 68, 68, 0.2);
      }
      
      .diff-overlay-btn.diff-reject:hover {
        background: rgba(239, 68, 68, 0.3);
        border-color: rgba(239, 68, 68, 0.8);
        color: #fca5a5;
      }
      
      /* Update mark styles for better interaction */
      .diff-mark {
        cursor: pointer;
        transition: all 0.2s;
        position: relative;
      }
      
      .diff-mark:hover {
        filter: brightness(1.3);
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
      }
      
      .diff-addition {
        background-color: rgba(34, 197, 94, 0.15) !important;
        border-bottom: 2px solid rgb(34, 197, 94) !important;
      }
      
      .diff-deletion {
        background-color: rgba(239, 68, 68, 0.15) !important;
        border-bottom: 2px solid rgb(239, 68, 68) !important;
        text-decoration: line-through;
        opacity: 0.8;
      }
      
      .diff-modification {
        background-color: rgba(6, 182, 212, 0.15) !important;
        border-bottom: 2px solid rgb(6, 182, 212) !important;
      }
      
      .diff-accepted {
        opacity: 0.6;
        filter: grayscale(0.5);
      }
      
      /* Add arrow pointing to mark */
      .diff-overlay::after {
        content: '';
        position: absolute;
        bottom: -6px;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 6px solid rgba(5, 7, 12, 0.98);
      }
    `;

    // Inject styles when the module loads
    if (typeof document !== 'undefined' && !document.getElementById('diff-overlay-styles')) {
      const style = document.createElement('style');
      style.id = 'diff-overlay-styles';
      style.textContent = DIFF_OVERLAY_STYLES;
      document.head.appendChild(style);
    }
  }

  debounce(func, wait) {
    let timeout
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  findScrollParent(element) {
    let parent = element.parentElement
    while (parent) {
      const style = getComputedStyle(parent)
      if (style.overflow === 'auto' || style.overflow === 'scroll' || 
          style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return parent
      }
      parent = parent.parentElement
    }
    return window
  }

  handleClick(event) {
    // Use closest to handle clicks on child elements
    const markElement = event.target.closest('.diff-mark')
    if (!markElement) return
    
    const changeId = markElement.getAttribute('data-change-id')
    if (!changeId) return
    
    // Prevent text selection and editor focus issues
    event.preventDefault()
    event.stopPropagation()
    
    // Show overlay for this change
    this.showOverlay(changeId, markElement)
  }

  handleOutsideClick(event) {
    // Check if click is outside overlay and marked text
    const isOverlayClick = event.target.closest('.diff-overlay')
    const isMarkClick = event.target.closest('.diff-mark')
    
    if (!isOverlayClick && !isMarkClick) {
      this.hideOverlay()
    }
  }

  showOverlay(changeId, markElement) {
    // Hide previous overlay if different change
    if (this.activeChangeId && this.activeChangeId !== changeId) {
      this.hideOverlay()
    }
    
    // Don't recreate if already showing
    if (this.activeChangeId === changeId) {
      return
    }
    
    this.activeChangeId = changeId
    
    // Create container for this specific overlay
    const overlayContainer = document.createElement('div')
    overlayContainer.className = 'diff-overlay-wrapper'
    this.portalContainer.appendChild(overlayContainer)
    this.overlays.set(changeId, overlayContainer)
    
    // Create root and render with React 18
    const root = createRoot(overlayContainer)
    this.overlayRoots.set(changeId, root)
    
    // Render overlay component with portal
    root.render(
      <DiffOverlayPortal
        changeId={changeId}
        markElement={markElement}
        onAccept={() => this.handleAction('accept', changeId)}
        onReject={() => this.handleAction('reject', changeId)}
        editor={this.editor}
      />
    )
    
    // Update position immediately
    this.updatePositions()
  }

  hideOverlay() {
    if (this.activeChangeId) {
      const overlayContainer = this.overlays.get(this.activeChangeId)
      if (overlayContainer) {
        const root = this.overlayRoots.get(this.activeChangeId)
        if (root) {
          root.unmount()
        }
        overlayContainer.remove()
        this.overlays.delete(this.activeChangeId)
        this.overlayRoots.delete(this.activeChangeId)
      }
      this.activeChangeId = null
    }
  }

  handleAction(action, changeId) {
    if (!this.editor) {
      console.error('[DiffOverlay] Cannot handle action - no editor set');
      return;
    }
    
    // Trigger the appropriate command
    if (action === 'accept') {
      this.editor.commands.acceptChange(changeId)
    } else if (action === 'reject') {
      this.editor.commands.rejectChange(changeId)
    }
    
    // Hide overlay after action
    this.hideOverlay()
  }

  updatePositions() {
    if (!this.activeChangeId || !this.editor) return
    
    // Find current mark element
    const markElement = this.editor.view.dom.querySelector(
      `[data-change-id="${this.activeChangeId}"]`
    )
    
    if (!markElement) {
      // Mark no longer visible
      this.hideOverlay()
      return
    }
    
    // Update overlay position
    const overlayContainer = this.overlays.get(this.activeChangeId)
    if (overlayContainer && overlayContainer.firstChild) {
      const event = new CustomEvent('updatePosition', { 
        detail: { markElement } 
      })
      overlayContainer.firstChild.dispatchEvent(event)
    }
  }

  destroy() {
    if (!this.editor || !this.initialized) return
    
    // Clean up event listeners
    this.editor.off('update', this.updateHandler)
    this.editor.off('selectionUpdate', this.updateHandler)
    this.editor.view.dom.removeEventListener('mousedown', this.handleClick)
    document.removeEventListener('mousedown', this.handleOutsideClick)
    
    if (this.scrollParent && this.scrollParent !== window) {
      this.scrollParent.removeEventListener('scroll', this.updateHandler)
    }
    window.removeEventListener('resize', this.updateHandler)
    
    // Clean up overlays
    this.overlays.forEach((container, changeId) => {
      const root = this.overlayRoots.get(changeId)
      if (root) {
        root.unmount()
      }
      container.remove()
    })
    this.overlays.clear()
    this.overlayRoots.clear()
    
    // Remove portal container
    if (this.portalContainer) {
      this.portalContainer.remove()
    }
  }
}

// React Portal component for better positioning control
const DiffOverlayPortal = ({ changeId, markElement, onAccept, onReject, editor }) => {
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [isVisible, setIsVisible] = React.useState(false);
  const [changeData, setChangeData] = React.useState(null);
  const overlayRef = React.useRef(null);
  
  // Get change data from the change manager
  React.useEffect(() => {
    if (editor && editor.storage.diffV2 && changeId) {
      const change = editor.storage.diffV2.changeManager.getChange(changeId);
      setChangeData(change);
    }
  }, [editor, changeId]);
  
  // Calculate position relative to viewport
  const updatePosition = React.useCallback(() => {
    if (!markElement) return;
    
    const rect = markElement.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    
    // Position below the mark with offset
    let newPosition = {
      top: rect.bottom + scrollTop + 8,
      left: rect.left + scrollLeft + (rect.width / 2) - 150 // Center horizontally
    };
    
    // Ensure overlay stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const overlayWidth = 300; // Approximate width
    const overlayHeight = 120; // Approximate height
    
    // Horizontal bounds
    if (newPosition.left < 10) {
      newPosition.left = 10;
    } else if (newPosition.left + overlayWidth > viewportWidth - 10) {
      newPosition.left = viewportWidth - overlayWidth - 10;
    }
    
    // Vertical bounds - flip above if too close to bottom
    if (rect.bottom + overlayHeight > viewportHeight - 20) {
      newPosition.top = rect.top + scrollTop - overlayHeight - 8;
    }
    
    setPosition(newPosition);
  }, [markElement]);
  
  // Update position on mount and when mark element changes
  React.useEffect(() => {
    updatePosition();
    
    // Show with animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    
    // Listen for scroll and resize
    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, { passive: true });
    window.addEventListener('resize', handleUpdate, { passive: true });
    
    // Listen for custom update event
    const handleCustomUpdate = (event) => {
      if (event.detail && event.detail.markElement) {
        updatePosition();
      }
    };
    
    if (overlayRef.current) {
      overlayRef.current.addEventListener('updatePosition', handleCustomUpdate);
    }
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
      if (overlayRef.current) {
        overlayRef.current.removeEventListener('updatePosition', handleCustomUpdate);
      }
    };
  }, [updatePosition, markElement]);
  
  const handleButtonClick = (action) => (event) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (action === 'accept') {
      onAccept();
    } else {
      onReject();
    }
  };
  
  // Don't render if no change data
  if (!changeData) return null;
  
  // Determine what to show based on change type
  const getChangeDescription = () => {
    switch (changeData.type) {
      case 'addition':
        return (
          <div className="diff-change-preview">
            <span className="diff-change-add">+ {changeData.suggestedText}</span>
          </div>
        );
      case 'deletion':
        return (
          <div className="diff-change-preview">
            <span className="diff-change-del">- {changeData.originalText}</span>
          </div>
        );
      case 'modification':
        return (
          <div className="diff-change-preview">
            <span className="diff-change-del">- {changeData.originalText}</span>
            <span className="diff-change-add">+ {changeData.suggestedText}</span>
          </div>
        );
      default:
        return null;
    }
  };
  
  // Portal render
  return ReactDOM.createPortal(
    <div
      ref={overlayRef}
      className={`diff-overlay ${isVisible ? 'diff-overlay-visible' : ''}`}
      style={{
        position: 'absolute',
        top: `${position.top}px`,
        left: `${position.left}px`,
        pointerEvents: 'auto',
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(-5px)',
        transition: 'opacity 0.2s, transform 0.2s'
      }}
    >
      <div className="diff-overlay-header">
        Suggested Change
      </div>
      <div className="diff-overlay-changes">
        {getChangeDescription()}
      </div>
      <div className="diff-overlay-content">
        <button
          className="diff-overlay-btn diff-accept"
          onMouseDown={handleButtonClick('accept')}
          title="Accept change"
        >
          <span>✓</span> Confirm
        </button>
        <button
          className="diff-overlay-btn diff-reject"
          onMouseDown={handleButtonClick('reject')}
          title="Reject change"
        >
          <span>✗</span> Decline
        </button>
      </div>
    </div>,
    document.body
  );
}; 