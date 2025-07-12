// Debug script to trace AI Edit flow
console.log('[AI Edit Flow Debug] Starting...');

// Create debugging panel
const createDebugPanel = () => {
  const panel = document.createElement('div');
  panel.id = 'ai-edit-debug-panel';
  panel.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 10px;
    width: 400px;
    max-height: 400px;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid cyan;
    border-radius: 8px;
    padding: 10px;
    font-family: monospace;
    font-size: 12px;
    color: white;
    z-index: 9999;
  `;
  
  const title = document.createElement('div');
  title.style.cssText = 'font-weight: bold; margin-bottom: 10px; color: cyan;';
  title.textContent = 'AI Edit Flow Debug';
  panel.appendChild(title);
  
  const logs = document.createElement('div');
  logs.id = 'debug-logs';
  panel.appendChild(logs);
  
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'Close';
  closeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; padding: 2px 8px;';
  closeBtn.onclick = () => panel.remove();
  panel.appendChild(closeBtn);
  
  document.body.appendChild(panel);
  return logs;
};

const logPanel = createDebugPanel();
const log = (msg, data = null) => {
  const entry = document.createElement('div');
  entry.style.cssText = 'margin-bottom: 5px; padding: 5px; background: rgba(0, 255, 255, 0.1); border-radius: 3px;';
  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span style="color: #888">[${time}]</span> ${msg}`;
  if (data) {
    const details = document.createElement('pre');
    details.style.cssText = 'margin: 5px 0 0 10px; font-size: 11px; color: #aaa;';
    details.textContent = JSON.stringify(data, null, 2);
    entry.appendChild(details);
  }
  logPanel.appendChild(entry);
  logPanel.scrollTop = logPanel.scrollHeight;
};

// Intercept keyboard events
const originalAddEventListener = EventTarget.prototype.addEventListener;
EventTarget.prototype.addEventListener = function(type, listener, options) {
  if (type === 'keydown' && this === window.document) {
    const wrappedListener = function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        log('🎹 Cmd+K detected', {
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          key: e.key,
          preventDefault: 'will be called'
        });
      }
      return listener.call(this, e);
    };
    return originalAddEventListener.call(this, type, wrappedListener, options);
  }
  return originalAddEventListener.call(this, type, listener, options);
};

// Intercept React state changes (if possible)
let interceptCount = 0;
const interceptStateChanges = () => {
  // Try to find the DocumentEditorPage component
  const findReactComponent = () => {
    const container = document.querySelector('#root');
    if (!container) return null;
    
    const key = Object.keys(container).find(key => key.startsWith('__reactContainer'));
    if (!key) return null;
    
    try {
      let fiber = container[key].child;
      while (fiber) {
        // Look for DocumentEditorPage component
        if (fiber.type && fiber.type.name === 'DocumentEditorPage') {
          return fiber;
        }
        if (fiber.child) {
          fiber = fiber.child;
        } else if (fiber.sibling) {
          fiber = fiber.sibling;
        } else {
          fiber = fiber.return?.sibling;
        }
      }
    } catch (e) {
      console.error('Error finding React component:', e);
    }
    return null;
  };
  
  const component = findReactComponent();
  if (component && component.memoizedState) {
    log('🔍 Found DocumentEditorPage component');
    
    // Try to intercept setSelectedTextForEdit and setShowAIEditModal
    let currentState = component.memoizedState;
    let stateIndex = 0;
    
    while (currentState) {
      log(`State hook #${stateIndex}`, {
        value: currentState.memoizedState,
        queue: currentState.queue ? 'has queue' : 'no queue'
      });
      
      currentState = currentState.next;
      stateIndex++;
    }
  }
  
  interceptCount++;
  if (interceptCount < 10) {
    setTimeout(interceptStateChanges, 1000);
  }
};

// Start intercepting after a delay
setTimeout(interceptStateChanges, 2000);

// Intercept modal rendering
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === 1) { // Element node
        // Check for AI Edit Modal
        if (node.querySelector && node.querySelector('h2')?.textContent === 'AI Edit Instruction') {
          log('🎭 AI Edit Modal appeared', {
            selectedText: node.querySelector('.italic')?.textContent
          });
        }
        
        // Check for processing state
        if (node.textContent && node.textContent.includes('Processing...')) {
          log('⏳ Processing state detected');
        }
      }
    });
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});

// Intercept fetch calls to AI service
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const [url, options] = args;
  
  if (url && url.includes('openai') || (options && options.body && options.body.includes('model'))) {
    log('🤖 AI API call intercepted', {
      url: url,
      method: options?.method,
      bodyPreview: options?.body ? options.body.substring(0, 200) + '...' : null
    });
  }
  
  const response = await originalFetch.apply(this, args);
  
  if (url && url.includes('openai')) {
    log('✅ AI API response received', {
      status: response.status,
      ok: response.ok
    });
  }
  
  return response;
};

// Intercept console logs related to AI Edit
const originalConsoleLog = console.log;
console.log = function(...args) {
  const message = args[0];
  if (typeof message === 'string' && 
      (message.includes('[DiffExtension]') || 
       message.includes('[AI Edit]') || 
       message.includes('AI edit'))) {
    log('📝 Console log:', args);
  }
  return originalConsoleLog.apply(this, args);
};

log('✅ AI Edit Flow Debug initialized');
log('👉 Instructions:', {
  step1: 'Select some text in the editor',
  step2: 'Press Cmd+K',
  step3: 'Observe the flow in this debug panel'
}); 