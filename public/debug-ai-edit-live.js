/**
 * Live AI Edit Debugger
 * This creates an overlay that shows real-time debugging info when using Cmd+K
 */

(function() {
  console.log('🔍 AI Edit Live Debugger Activated');
  
  // Create debug overlay
  const debugOverlay = document.createElement('div');
  debugOverlay.id = 'ai-edit-debugger';
  debugOverlay.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 400px;
    max-height: 80vh;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #00ffff;
    border-radius: 8px;
    padding: 16px;
    color: #00ffff;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    overflow-y: auto;
    display: none;
    box-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
  `;
  
  debugOverlay.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <h3 style="margin: 0; color: #00ffff;">AI Edit Debugger</h3>
      <button id="debug-close" style="background: none; border: 1px solid #00ffff; color: #00ffff; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>
    </div>
    <div id="debug-content"></div>
  `;
  
  document.body.appendChild(debugOverlay);
  
  // Close button
  document.getElementById('debug-close').onclick = () => {
    debugOverlay.style.display = 'none';
  };
  
  // Debug log function
  let debugLog = [];
  function addDebugEntry(title, data, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    debugLog.unshift({
      timestamp,
      title,
      data,
      isError
    });
    
    // Keep only last 20 entries
    if (debugLog.length > 20) {
      debugLog.pop();
    }
    
    updateDebugDisplay();
  }
  
  function updateDebugDisplay() {
    const content = document.getElementById('debug-content');
    content.innerHTML = debugLog.map(entry => `
      <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 255, 255, 0.1); border-radius: 4px; border-left: 3px solid ${entry.isError ? '#ff3333' : '#00ffff'};">
        <div style="color: ${entry.isError ? '#ff3333' : '#00ffff'}; font-weight: bold;">${entry.timestamp} - ${entry.title}</div>
        <pre style="margin: 4px 0; color: #ffffff; white-space: pre-wrap; word-break: break-all;">${JSON.stringify(entry.data, null, 2)}</pre>
      </div>
    `).join('');
  }
  
  // Intercept the handleAIEditRequest function
  if (window.handleAIEditRequest) {
    const originalHandler = window.handleAIEditRequest;
    window.handleAIEditRequest = function(params) {
      debugOverlay.style.display = 'block';
      addDebugEntry('handleAIEditRequest called', {
        params,
        paramKeys: Object.keys(params || {}),
        hasQuarantine: params && 'quarantine' in params,
        quarantineContent: params?.quarantine?.content
      });
      
      try {
        return originalHandler.call(this, params);
      } catch (error) {
        addDebugEntry('handleAIEditRequest ERROR', {
          message: error.message,
          stack: error.stack
        }, true);
        throw error;
      }
    };
  }
  
  // Monitor DocumentEditorPage component
  const checkForHandler = setInterval(() => {
    const editor = window.editor;
    if (!editor) return;
    
    // Check DiffExtension configuration
    const diffExtension = editor.extensionManager.extensions.find(ext => ext.name === 'diffV2');
    if (diffExtension) {
      addDebugEntry('DiffExtension Config', {
        hasOnRequestEdit: !!diffExtension.options.onRequestEdit,
        onRequestEditType: typeof diffExtension.options.onRequestEdit
      });
      
      // Wrap the onRequestEdit handler
      if (diffExtension.options.onRequestEdit && !diffExtension.options.onRequestEdit._debugWrapped) {
        const originalOnRequestEdit = diffExtension.options.onRequestEdit;
        diffExtension.options.onRequestEdit = function(params) {
          debugOverlay.style.display = 'block';
          
          addDebugEntry('DiffExtension.onRequestEdit called', {
            params,
            paramStructure: {
              hasSelection: params && 'selection' in params,
              selectionKeys: params?.selection ? Object.keys(params.selection) : [],
              selectionData: params?.selection
            }
          });
          
          try {
            return originalOnRequestEdit.call(this, params);
          } catch (error) {
            addDebugEntry('onRequestEdit ERROR', {
              message: error.message,
              stack: error.stack,
              attemptedToAccess: error.message.includes('content') ? 'quarantine.content' : 'unknown'
            }, true);
            throw error;
          }
        };
        diffExtension.options.onRequestEdit._debugWrapped = true;
      }
      
      clearInterval(checkForHandler);
    }
  }, 100);
  
  // Monitor keyboard events
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      const editor = window.editor;
      if (!editor) {
        addDebugEntry('Cmd+K pressed - No editor', { editorExists: false }, true);
        return;
      }
      
      const { selection } = editor.state;
      const hasSelection = !selection.empty;
      const selectedText = hasSelection ? editor.state.doc.textBetween(selection.from, selection.to) : null;
      
      addDebugEntry('Cmd+K pressed', {
        hasEditor: true,
        hasSelection,
        selectionRange: { from: selection.from, to: selection.to },
        selectedText: selectedText ? selectedText.substring(0, 50) + '...' : null,
        diffExtensionActive: !!editor.storage.diffV2?.isActive
      });
    }
  });
  
  // Add toggle shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      debugOverlay.style.display = debugOverlay.style.display === 'none' ? 'block' : 'none';
    }
  });
  
  console.log('✅ Debug overlay ready. Press Cmd+Shift+D to toggle visibility.');
  console.log('📝 Select text and press Cmd+K to see what happens!');
  
})(); 