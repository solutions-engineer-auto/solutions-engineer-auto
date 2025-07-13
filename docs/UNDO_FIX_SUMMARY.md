# Undo Fix for Diff Overlay

## Problem

When accepting a diff suggestion and then using Cmd+Z to undo:
- ✅ The text reverted correctly
- ✅ The cyan highlight returned
- ❌ Clicking on the highlight did nothing (no overlay appeared)

## Root Cause

The issue was in the data flow:

1. When a change is accepted, `acceptChange` removes it from ChangeManager:
   ```javascript
   this.storage.changeManager.removeChange(changeId)
   ```

2. When undoing, TipTap restores the mark with its `data-change-id` attribute

3. But the overlay couldn't display because it needs the change data:
   ```javascript
   const change = changeManager.getChange(changeId); // Returns null!
   if (!changeData) return null; // Overlay doesn't render
   ```

## Solution

Store the essential change data in the mark attributes themselves:

### 1. Extended DiffMark attributes
Added `originalText` and `suggestedText` attributes to the mark so it's self-contained.

### 2. Updated mark creation
The `markDiff` command now accepts and stores the text values:
```javascript
markDiff(from, to, type, changeId, status, originalText, suggestedText)
```

### 3. Fallback in overlay
The overlay now checks mark attributes when ChangeManager doesn't have the data:
```javascript
if (!change && markElement) {
  // Reconstruct from mark attributes
  const originalText = markElement.getAttribute('data-original-text');
  const suggestedText = markElement.getAttribute('data-suggested-text');
  // ... create changeData from attributes
}
```

## Testing

Run the test script:
```javascript
const script = document.createElement('script');
script.src = '/test-undo-fix.js';
document.body.appendChild(script);
```

Then:
1. Click cyan text → Confirm
2. Press Cmd+Z to undo
3. Click cyan text again
4. ✅ Overlay should appear!

## Benefits

- Undo/redo now works correctly with overlays
- Marks are self-contained with all needed data
- More resilient to state management issues
- Better support for collaborative editing (future) 