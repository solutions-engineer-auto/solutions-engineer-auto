// Test script to verify AI Edit Modal state fix
console.log('🔍 Testing Modal State Fix...');

// Monitor modal state
const monitorModal = () => {
  let modalOpenCount = 0;
  let lastModalState = null;
  
  const checkModal = () => {
    const modal = document.querySelector('h2')?.textContent === 'AI Edit Instruction' 
      ? document.querySelector('.fixed.inset-0') 
      : null;
      
    if (modal) {
      // Check if it's in processing state
      const processingButton = modal.querySelector('button span')?.textContent?.includes('Processing');
      const cancelButton = Array.from(modal.querySelectorAll('button')).find(btn => 
        btn.textContent === 'Cancel'
      );
      const cancelDisabled = cancelButton?.disabled;
      
      const currentState = {
        open: true,
        processing: processingButton || false,
        cancelDisabled: cancelDisabled || false
      };
      
      // Log state changes
      if (!lastModalState || 
          lastModalState.open !== currentState.open ||
          lastModalState.processing !== currentState.processing ||
          lastModalState.cancelDisabled !== currentState.cancelDisabled) {
        
        modalOpenCount++;
        console.log(`📋 Modal State Change #${modalOpenCount}:`, {
          ...currentState,
          cancelButtonFound: !!cancelButton
        });
        
        if (currentState.processing && currentState.cancelDisabled) {
          console.error('❌ BUG: Cancel button is disabled during processing!');
        } else if (currentState.processing && !currentState.cancelDisabled) {
          console.log('✅ Good: Cancel button is enabled during processing');
        }
        
        lastModalState = currentState;
      }
    } else if (lastModalState?.open) {
      console.log('📋 Modal closed');
      lastModalState = { open: false };
    }
  };
  
  // Check every 100ms
  setInterval(checkModal, 100);
  
  console.log('✅ Modal monitor started');
  console.log('📝 Instructions:');
  console.log('1. Select text and press Cmd+K');
  console.log('2. Enter instruction and submit');
  console.log('3. Try to click Cancel during processing');
  console.log('4. After completion, press Cmd+K again');
  console.log('5. Check if it opens fresh (not in processing state)');
};

// Create visual indicator
const createIndicator = () => {
  const indicator = document.createElement('div');
  indicator.id = 'modal-state-indicator';
  indicator.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 15px;
    border-radius: 8px;
    font-family: monospace;
    font-size: 12px;
    z-index: 10000;
    border: 2px solid #10b981;
    min-width: 300px;
  `;
  
  const updateIndicator = () => {
    const modal = document.querySelector('h2')?.textContent === 'AI Edit Instruction' 
      ? document.querySelector('.fixed.inset-0') 
      : null;
      
    if (modal) {
      const processingButton = modal.querySelector('button span')?.textContent?.includes('Processing');
      const cancelButton = Array.from(modal.querySelectorAll('button')).find(btn => 
        btn.textContent === 'Cancel'
      );
      const cancelDisabled = cancelButton?.disabled;
      
      indicator.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #10b981;">Modal State Monitor</h3>
        <div>Status: <span style="color: #10b981;">Open</span></div>
        <div>Processing: <span style="color: ${processingButton ? '#f59e0b' : '#10b981'}">${processingButton ? 'Yes' : 'No'}</span></div>
        <div>Cancel Enabled: <span style="color: ${cancelDisabled ? '#ef4444' : '#10b981'}">${!cancelDisabled ? 'Yes' : 'No'}</span></div>
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #444;">
          ${processingButton && !cancelDisabled 
            ? '<span style="color: #10b981;">✅ Fix Applied!</span>' 
            : processingButton && cancelDisabled
            ? '<span style="color: #ef4444;">❌ Bug Still Present</span>'
            : '<span style="color: #6b7280;">Waiting...</span>'
          }
        </div>
      `;
    } else {
      indicator.innerHTML = `
        <h3 style="margin: 0 0 10px 0; color: #10b981;">Modal State Monitor</h3>
        <div>Status: <span style="color: #6b7280;">Closed</span></div>
        <div style="margin-top: 10px; color: #6b7280;">Press Cmd+K to open modal</div>
      `;
    }
  };
  
  document.body.appendChild(indicator);
  setInterval(updateIndicator, 100);
  
  // Add close button
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: none; border: none; color: white; cursor: pointer;';
  closeBtn.onclick = () => indicator.remove();
  indicator.appendChild(closeBtn);
};

// Start monitoring
monitorModal();
createIndicator();

console.log('✅ Modal State Fix Test Ready!'); 