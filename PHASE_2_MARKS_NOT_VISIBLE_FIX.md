# Phase 2: Marks Not Visible - Root Cause Analysis & Fix

## Problem Summary
User reported that diff marks weren't appearing when using the test commands. The console showed:
- "Invalid change position" errors when trying to add changes
- Document size was 2 (empty document)
- Even with valid text selection, no marks appeared visually

## Root Causes Identified

### 1. Empty Document Issue [[memory:2768147]]
- A document size of 2 indicates an empty ProseMirror document (doc node + empty paragraph)
- Test script was trying to add changes at positions (10-20, 50-60, 100-110) that didn't exist
- This caused "Position out of bounds" errors

### 2. Missing CSS Injection
- CSS styles for diff marks were only being injected in `DiffOverlay.jsx`
- The overlay only initializes when a mark is clicked
- Without the CSS, marks were being applied to the DOM but were invisible

### 3. Inline Styles Not Specific Enough
- The `DiffMark.renderHTML()` was creating inline styles but they lacked padding
- Without padding, the marks could be effectively invisible even with background color

## Fixes Applied

### 1. Enhanced DiffExtensionV2 with CSS Injection
```javascript
// In onCreate() method
if (!document.getElementById('diff-mark-styles')) {
  const style = document.createElement('style')
  style.id = 'diff-mark-styles'
  style.textContent = `/* CSS for diff marks */`
  document.head.appendChild(style)
}
```

### 2. Added Debug Logging
```javascript
// In applyMarkForChange()
console.log('[DiffExtension] Applying mark:', {
  changeId: change.id,
  type: change.type,
  from, to,
  text: extension.editor.state.doc.textBetween(from, to)
})
```

### 3. Updated Test Script
- Added `ensureDocumentHasContent()` helper that adds test content if document is empty
- Improved position finding to work with actual document structure
- Added `diffTest.debug()` command for comprehensive system state

### 4. Enhanced DiffMark Rendering
```javascript
// Added padding and better inline styles
const baseStyles = [
  `background-color: ${color}1a`,
  `border-bottom: 2px solid ${color}`,
  'position: relative',
  'padding: 1px 2px',  // Critical for visibility
  'cursor: pointer'
]
```

## Testing the Fix

1. **Reload the page** to get the updated code
2. **Open console** and check for "[DiffExtension] CSS styles injected"
3. **Run the test script**:
   ```javascript
   const script = document.createElement('script');
   script.src = '/test-phase2-integration.js';
   document.head.appendChild(script);
   ```

4. **Use debug command** to verify system state:
   ```javascript
   diffTest.debug()
   ```

5. **Run the full flow test**:
   ```javascript
   diffTest.fullFlow()
   ```

## Expected Behavior After Fix

1. CSS styles will be injected on extension load
2. Empty documents will automatically get test content
3. Console will show detailed logs of mark application
4. Marks will be visible with:
   - Green background for additions
   - Red background with strikethrough for deletions
   - Cyan background for modifications
   - 2px colored bottom border
   - Slight padding for better visibility

## Key Learnings [[memory:2775772]]

1. **Always inject critical CSS early** - Don't wait for user interaction
2. **Handle empty documents gracefully** - Check document size before adding marks
3. **Use comprehensive logging** - Makes debugging much easier
4. **Inline styles need padding** - Background color alone might not be visible
5. **Provide debug utilities** - diffTest.debug() helps diagnose issues quickly

## Next Steps

If marks are still not visible after these fixes:
1. Check browser console for any errors
2. Run `diffTest.debug()` and share the output
3. Check if any other CSS might be overriding the styles
4. Verify the feature flag is enabled: `DIFF_ENABLED` in featureFlags.js 