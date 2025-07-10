# Phase 2: Stale Editor Reference Bug - Root Cause & Fix

## Problem Discovery

User's debug output showed a critical discrepancy:
- Debug script reported: `Document size: 2961`
- But when applying marks: `Invalid change position: from=1, to=11, docSize=2`

This meant the editor reference was stale or incorrect.

## Root Cause

In TipTap extensions, the editor reference during `onCreate()` is NOT the live editor instance. This happens because:

1. TipTap creates extensions before the editor is fully initialized
2. The `this.editor` reference in `onCreate` points to an early/incomplete editor instance
3. Any closures or services that capture this reference will use the stale version

## The Failed First Attempt

Initially tried to fix by getting editor from ChangeManager:
```javascript
// This didn't work because ChangeManager also had stale editor
const currentEditor = extension.storage.changeManager.editor
```

But ChangeManager was created with the same stale editor reference!

## The Complete Fix [[memory:2776291]]

### 1. Don't Store Editor References
```javascript
// ❌ WRONG - Stores stale reference
this.storage.changeManager = new ChangeManagerV2(this.editor)

// ✅ CORRECT - No editor parameter
this.storage.changeManager = new ChangeManagerV2()
```

### 2. Create a Dynamic Getter
```javascript
onCreate() {
  const extension = this
  
  // Store a function that returns current editor
  this.storage.getEditor = () => extension.editor
  
  // ... rest of onCreate
}
```

### 3. Always Get Editor Dynamically
```javascript
this.storage.applyMarkForChange = (change) => {
  // ✅ Get current editor when needed
  const currentEditor = extension.storage.getEditor()
  const docSize = currentEditor.state.doc.content.size
  
  // Now docSize is correct!
}
```

## Why This Works

- `extension.editor` is updated by TipTap after initialization
- The getter function always returns the current value
- No stale references are stored anywhere

## Key Lessons

1. **Never store `this.editor` during onCreate**
2. **Use dynamic getters for editor access**
3. **Don't pass editor to services/managers in constructors**
4. **Test with `docSize` to verify correct editor reference**

## Verification

Run the test script to verify the fix:
```javascript
const script = document.createElement('script');
script.src = '/test-phase2-working.js';
document.head.appendChild(script);
```

Look for:
- "Dynamic editor doc size" matching window.editor size
- Successful mark application
- Visible highlights in the DOM 