// Simple visual test for Cmd+K fix
console.log('🔍 Simple Cmd+K Test Started');

// Count Cmd+K presses
let pressCount = 0;
let modalCount = 0;

// Create visual counter
const counter = document.createElement('div');
counter.style.cssText = `
  position: fixed;
  top: 70px;
  right: 20px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 20px;
  border-radius: 10px;
  font-family: monospace;
  font-size: 14px;
  z-index: 10000;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  border: 2px solid cyan;
  min-width: 250px;
`;

counter.innerHTML = `
  <h3 style="margin: 0 0 10px 0; color: cyan;">Cmd+K Test Monitor</h3>
  <div id="press-count">Cmd+K presses: 0</div>
  <div id="modal-count">Modals shown: 0</div>
  <div id="status" style="margin-top: 10px; padding: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 5px;">
    Status: Waiting for Cmd+K...
  </div>
  <button onclick="this.parentElement.remove()" style="position: absolute; top: 5px; right: 5px; background: none; border: none; color: white; cursor: pointer;">✕</button>
`;

document.body.appendChild(counter);

// Monitor keyboard
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    pressCount++;
    document.getElementById('press-count').textContent = `Cmd+K presses: ${pressCount}`;
    document.getElementById('status').innerHTML = '<span style="color: yellow;">⏳ Processing...</span>';
    
    // Check for modal after delay
    setTimeout(() => {
      const modals = document.querySelectorAll('.fixed.inset-0:not(#root)');
      const newModalCount = modals.length;
      
      if (newModalCount > modalCount) {
        modalCount = newModalCount;
        document.getElementById('modal-count').textContent = `Modals shown: ${modalCount}`;
      }
      
      // Update status
      const statusEl = document.getElementById('status');
      if (modalCount > pressCount) {
        statusEl.innerHTML = '<span style="color: red;">❌ Multiple handlers detected!</span>';
      } else if (modalCount === pressCount) {
        statusEl.innerHTML = '<span style="color: green;">✅ Working correctly!</span>';
      } else {
        statusEl.innerHTML = '<span style="color: orange;">⚠️ Modal may not have appeared</span>';
      }
    }, 200);
  }
}, true);

// Instructions
console.log('✅ Test monitor created!');
console.log('📝 Instructions:');
console.log('1. Select some text');
console.log('2. Press Cmd+K');
console.log('3. Watch the counter in the top-right');
console.log('4. Press count should equal modal count'); 