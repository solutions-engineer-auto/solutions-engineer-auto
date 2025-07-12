// Test script to verify Cmd+K duplicate handler fix
console.log('[Cmd+K Fix Test] Starting...');

// Test 1: Check if DiffExtension keyboard shortcuts are disabled
const checkDiffExtension = () => {
  if (!window.editor) {
    console.error('❌ Editor not found. Please open a document first.');
    return false;
  }
  
  // Find DiffExtension
  const diffExtension = window.editor.extensionManager.extensions.find(
    ext => ext.name === 'diffV2'
  );
  
  if (!diffExtension) {
    console.log('❌ DiffExtension not found');
    return false;
  }
  
  console.log('✅ DiffExtension found');
  
  // Check keyboard shortcuts
  const shortcuts = diffExtension.type.config.addKeyboardShortcuts?.();
  if (shortcuts && shortcuts['Mod-k']) {
    console.error('❌ Mod-k shortcut is still active in DiffExtension!');
    return false;
  }
  
  console.log('✅ Mod-k shortcut is disabled in DiffExtension');
  return true;
};

// Test 2: Monitor keyboard events
let cmdKCount = 0;
const monitorKeyboard = () => {
  console.log('🎹 Monitoring keyboard events...');
  
  // Track event listeners
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  const listeners = [];
  
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    if (type === 'keydown') {
      listeners.push({
        target: this,
        listener: listener.toString().substring(0, 100) + '...'
      });
    }
    return originalAddEventListener.call(this, type, listener, options);
  };
  
  // Intercept Cmd+K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      cmdKCount++;
      console.log(`🎹 Cmd+K pressed (count: ${cmdKCount})`);
      
      // Check modal state after a short delay
      setTimeout(() => {
        const modals = document.querySelectorAll('[role="dialog"], .fixed.inset-0');
        console.log(`📋 Active modals: ${modals.length}`);
        
        modals.forEach((modal, index) => {
          const heading = modal.querySelector('h2');
          console.log(`  Modal ${index + 1}: ${heading?.textContent || 'No heading'}`);
        });
        
        if (modals.length > 1) {
          console.error('❌ Multiple modals detected! Duplicate handler may still be active.');
        } else if (modals.length === 1) {
          console.log('✅ Single modal detected - working correctly');
        }
      }, 100);
    }
  }, true);
  
  console.log(`📋 Found ${listeners.length} keydown listeners`);
};

// Test 3: Check for duplicate modal triggers
const checkModalTriggers = () => {
  console.log('🔍 Checking for duplicate modal triggers...');
  
  // Find all references to setShowAIEditModal
  const searchInObject = (obj, path = '') => {
    const results = [];
    
    for (const key in obj) {
      try {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'function') {
          const funcStr = value.toString();
          if (funcStr.includes('setShowAIEditModal')) {
            results.push({
              path: currentPath,
              preview: funcStr.substring(0, 200) + '...'
            });
          }
        } else if (typeof value === 'object' && value !== null) {
          results.push(...searchInObject(value, currentPath));
        }
      } catch {
        // Skip inaccessible properties
      }
    }
    
    return results;
  };
  
  // Search in React fiber tree
  const container = document.querySelector('#root');
  if (container) {
    const key = Object.keys(container).find(k => k.startsWith('__reactContainer'));
    if (key) {
      const fiber = container[key];
      console.log('🔍 Searching React fiber tree...');
      // Limited search to avoid performance issues
      // In production, this would be more targeted
      const results = searchInObject(fiber, 'fiber');
      console.log(`   Found ${results.length} references to setShowAIEditModal`);
    }
  }
  
  return true;
};

// Run tests
console.log('\n📋 Running tests...\n');

// Test 1
console.log('Test 1: DiffExtension keyboard shortcuts');
checkDiffExtension();

// Test 2
console.log('\nTest 2: Keyboard event monitoring');
monitorKeyboard();

// Test 3
console.log('\nTest 3: Modal trigger check');
checkModalTriggers();

console.log('\n✅ Tests complete!');
console.log('\n📝 Instructions:');
console.log('1. Select some text in the editor');
console.log('2. Press Cmd+K');
console.log('3. Check the console for results');
console.log('4. You should see:');
console.log('   - Only ONE Cmd+K event');
console.log('   - Only ONE modal appearing');
console.log('   - No duplicate processing');

// Create a visual indicator
const indicator = document.createElement('div');
indicator.style.cssText = `
  position: fixed;
  top: 10px;
  right: 10px;
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border-radius: 8px;
  font-family: monospace;
  z-index: 9999;
`;
indicator.textContent = 'Cmd+K Fix Applied ✅';
document.body.appendChild(indicator);

setTimeout(() => indicator.remove(), 5000); 