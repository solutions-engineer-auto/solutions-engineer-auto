# AI Diff System - Phase 2 Test Instructions

## ✅ Current Status
The AI diff system Phase 2 is now working using the mark-based approach with GitHub/Cursor-style behavior:
- Visual highlights appear correctly (green/red/cyan)
- Click detection works on highlights
- Accept/reject overlay appears with React Portals
- **Accept**: Applies changes (keeps additions, removes deletions)
- **Reject**: Reverts changes (removes additions, restores deletions)
- Just like GitHub pull request diffs!

## 🧪 Test Files Created

### 1. `public/test-phase2-simple.js`
**Purpose**: Basic functionality test for single change

**To Run**:
```javascript
/test-phase2-simple.js
```

**What It Tests**:
- ✅ Single highlight appears
- ✅ Overlay shows on click
- ✅ Accept button applies change
- ✅ Content is modified correctly

### 2. `public/test-phase2-multiple.js`
**Purpose**: Test multiple simultaneous changes

**To Run**:
```javascript
/test-phase2-multiple.js
```

**What It Tests**:
- Multiple highlights (addition, deletion, modification)
- Overlay switching between marks
- Batch operations
- Change statistics

### 3. `public/test-phase2-multiple-fixed.js` ⭐ NEW
**Purpose**: Fixed version for reliable multiple changes

**To Run**:
```javascript
/test-phase2-multiple-fixed.js
```

**What It Tests**:
- ✅ Safe word boundary detection
- ✅ Non-overlapping changes only
- ✅ Proper position validation
- ✅ Error recovery

**Key Improvements**:
- Finds actual words in the document
- Avoids position conflicts
- Validates positions before applying
- Better error messages

### 4. `public/test-github-style-fixed.js` ⭐⭐⭐ USE THIS ONE!
**Purpose**: FIXED version with correct ProseMirror positions

**To Run**:
```javascript
/test-github-style-fixed.js
```

**Why This Version**:
- ✅ Uses proper ProseMirror position calculation
- ✅ No more "mismatched transaction" errors!
- ✅ Shows correct colors (red/cyan)
- ✅ Accept/reject works properly

**Key Fix**: Accounts for document structure (paragraph node adds +1 to positions)

### 5. `public/test-github-style-diff.js` ⚠️ BROKEN - DO NOT USE
**Purpose**: Original test with position calculation errors

**Problem**: Uses plain text positions, causing transaction errors

### 6. `public/test-phase2-current-state.js`
**Purpose**: Verify system configuration

**To Run**:
```javascript
/test-phase2-current-state.js
```

**What It Shows**:
- Extension loaded status
- Available commands
- Storage contents
- CSS injection status

## 🔍 Manual Testing Steps

### 1. Enable Diff Mode
```javascript
editor.commands.toggleDiffMode()
```

### 2. Add a Test Change
```javascript
editor.commands.addChange({
  type: 'modification',
  originalText: 'old text',
  suggestedText: 'new text',
  position: { from: 10, to: 18 }
})
```

### 3. Interact with Highlights
- Click on the highlighted text
- Overlay should appear below/above
- Click Accept to apply the change
- Click Reject to remove the highlight

## 🎯 Common Operations

### Clear All Changes
```javascript
editor.storage.diffV2.changeManager.clear()
```

### Get Change Statistics
```javascript
editor.storage.diffV2.changeManager.getStatistics()
```

### Check Active Changes
```javascript
const changes = editor.storage.diffV2.changeManager.getChanges()
console.table(changes)

## 🛠️ Recent Fixes

### 🚨 CRITICAL FIX: ProseMirror Position Errors (Root Cause Found!)
**Problem**: All tests were using plain text positions, not ProseMirror positions
**Symptoms**: 
- "RangeError: Applying a mismatched transaction" on every operation
- Marks appearing as green (failed marks defaulted to addition color)
- Accept/reject deleting wrong text

**Solution**: [[memory:2783750]]
1. ProseMirror positions account for node structure (paragraph = +1)
2. Use `doc.descendants()` to find correct positions
3. Run `/test-github-style-fixed.js` for working version

**Impact**: This was the root cause of ALL our issues!

### Fixed: All Highlights Showing as Green
**Problem**: CSS `!important` declarations overrode inline styles
**Solution**:
1. Removed `!important` from CSS injection in DiffExtensionV2
2. Let inline styles from DiffMark.js set colors
3. Run `/fix-colors.js` to fix without reloading

**Now shows correct colors**:
- 🔴 Red deletions with strikethrough
- 🔵 Cyan modifications
- 🟢 Green additions (when implemented)

### Fixed: "RangeError: Applying a mismatched transaction"
**Problem**: Position validation wasn't being saved in ChangeManagerV2
**Solution**: 
1. Added missing `updateChange` method to ChangeManagerV2
2. Now properly updates positions after validation
3. Prevents stale position errors

### Fixed: Multiple Changes Not Working
**Problem**: Only one change would appear
**Solution**: Created `test-phase2-multiple-fixed.js` with:
- Proper word boundary detection
- Non-overlapping position calculation
- Position validation before applying marks

## 🔧 Troubleshooting

### If highlights don't appear:
1. Check if diff mode is enabled
2. Verify document has content (size > 2)
3. Check browser console for errors
4. Ensure positions are valid (0-based, within document bounds)

### If overlay doesn't show:
1. Check if click event is reaching the mark
2. Verify portal container exists in DOM
3. Look for React errors in console

### If accept/reject doesn't work:
1. Check for transaction errors
2. Verify change positions are still valid
3. Ensure editor is not read-only

## 📝 Expected Results

After running tests, you should see:

✅ **Visual Results:**
- Cyan underline for modifications
- Green underline for additions
- Red strikethrough for deletions
- Glassmorphic overlay on click
- Text changes when accepted
- Highlights disappear when rejected

✅ **Console Output:**
- "Diff mode enabled"
- "Change added successfully"
- "Change accepted/rejected"
- No transaction errors

## 🚀 Next Steps

1. **Multiple Changes**: Test with 5+ simultaneous changes
2. **Integration**: Connect with Phase 1 selection system
3. **Performance**: Test with large documents
4. **Edge Cases**: Overlapping changes, rapid accepts 