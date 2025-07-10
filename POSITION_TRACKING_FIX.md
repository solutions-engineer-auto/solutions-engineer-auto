# Position Tracking Fix for Diff System

## Problem
When text was added before a diff mark, the mark would correctly move to its new position (thanks to ProseMirror's mark system), but the accept/reject commands would still use the old stored position from ChangeManager. This caused operations to modify the wrong text.

## Solution
Added a `findMarkPositionById()` helper that looks up the current position of a mark just before performing accept/reject operations. This ensures we always use the mark's actual current position rather than the stored one.

## Implementation Details

### Changes Made
1. Added `findMarkPositionById()` helper function in `DiffExtensionV2.js`
2. Updated `acceptChange` command to use current mark position
3. Updated `rejectChange` command to use current mark position
4. Added comprehensive debug logging to detect position drift

### How It Works
```javascript
// Before (buggy):
const { from, to } = change.position;  // Uses stored position

// After (fixed):
const currentMarkPosition = findMarkPositionById(editor, changeId);
const { from, to } = currentMarkPosition;  // Uses current position
```

### Debug Output
When position drift is detected, you'll see console logs like:
```
[acceptChange] POSITION DRIFT DETECTED: {
  changeId: "change-123",
  storedPosition: { from: 10, to: 20 },
  currentPosition: { from: 30, to: 40 },
  drift: { from: 20, to: 20 },
  markedText: "the text that moved"
}
```

## Testing
Run the test script to verify the fix:
```javascript
const script = document.createElement('script');
script.src = '/test-position-tracking-fix.js';
document.body.appendChild(script);
```

The test will:
1. Create a document with a mark
2. Insert text before the mark
3. Show that the mark moved
4. Demonstrate that accept/reject now works correctly

## Benefits
- Minimal change to existing code
- Easy to revert if needed
- Comprehensive logging for debugging
- Solves the exact problem without changing architecture

## Future Considerations
This is a tactical fix. A more comprehensive solution might involve:
- Removing position storage from ChangeManager entirely
- Using marks as the single source of truth
- Implementing position mapping for complex scenarios

But for now, this fix solves the immediate problem with minimal risk. 