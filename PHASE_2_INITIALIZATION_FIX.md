# Phase 2: Initialization Timing Fix

## Problem Identified
The marks were disappearing because of initialization timing issues:
- Editor reference was stale during extension creation (docSize=2)
- DiffOverlay was trying to use editor before it was ready
- Commands were executing with incomplete editor state

## Fixes Applied

### 1. Pass Editor from Command Context
Instead of storing stale editor references, get the editor from command context:
```javascript
// OLD - Uses stale reference
addChange: (change) => () => {
  // extension.editor might be stale
}

// NEW - Gets current editor
addChange: (change) => ({ editor }) => {
  // editor is always current
}
```

### 2. Pass Editor to Helper Functions
Helper functions now accept editor as parameter:
```javascript
this.storage.applyMarkForChange(completeChange, currentEditor)
```

### 3. Delayed DiffOverlay Initialization
DiffOverlay no longer requires editor in constructor:
```javascript
// OLD
new DiffOverlay(this.editor) // Editor not ready!

// NEW
const overlay = new DiffOverlay()
// Later, when editor is ready:
overlay.setEditor(this.editor)
```

### 4. Robust Test Script
New test waits for editor to be fully initialized:
```javascript
function waitForEditor(callback) {
  if (window.editor && window.editor.state.doc.content.size > 2) {
    callback(window.editor);
  } else {
    setTimeout(() => waitForEditor(callback), 100);
  }
}
```

## Testing Instructions

1. **Refresh the page** (critical!)

2. **Run the robust test**:
```javascript
const script = document.createElement('script');
script.src = '/test-phase2-robust.js';
document.head.appendChild(script);
```

This test will:
- Wait for editor initialization
- Show actual document size (should be 2961, not 2)
- Add changes with proper validation
- Provide helpers for testing

## Key Lessons

1. **Never trust editor references during initialization**
2. **Always get editor from command context when available**
3. **Delay operations until editor is fully ready**
4. **Test with document size to verify initialization**

The marks should now appear reliably! 