# Unused Code Removal - Testing Guide

## 🎯 What We Changed

We've updated `src/extensions/DiffExtension/index.js`:
- ❌ Removed `DiffExtensionV1` import and export (nothing uses it)
- ❌ Removed `SelectionHandler` export (only used by V1 internally)
- ❌ Removed `ContextBuilder` export (only used by V1 internally)
- ✅ Kept `DiffExtensionV2` (exported as default `DiffExtension`)
- ✅ Kept `ChangeManagerV2` (used by V2)

## ✅ Testing Checklist

### 1. Build Tests ✅ PASSED

```bash
# Clean build
rm -rf dist/
npm run build
```

**Result**: Build completes successfully (tested and confirmed)

### 2. Development Server

```bash
# Kill any existing servers first
pkill -f vite

# Start fresh
npm run dev
```

**Expected**: 
- Server starts without errors
- No console errors about missing imports

### 3. Editor Functionality

Once the dev server is running, navigate to a document:

1. **Login** at http://localhost:5173/login (or whatever port opens)
2. **Navigate** to any account
3. **Open** a document in the editor

#### Test Diff Mode:
1. Press **Cmd+D** (Mac) or **Ctrl+D** (Windows/Linux)
2. Console should show: `[DiffExtension] Diff mode: ON`
3. No errors should appear

#### Test Adding Changes:
Open browser console and run:
```javascript
// Add a test change
const editor = window.editor;
editor.commands.addChange({
  type: 'modification',
  originalText: 'text',
  suggestedText: 'modified text',
  position: { from: 10, to: 14 }
});
```

**Expected**: 
- Change is added without errors
- Text is highlighted in cyan

### 4. Unit Tests

```bash
npm test
```

**Expected**: 
- `ChangeManagerV2.test.js` passes
- `SelectionHandler.test.js` and `contextBuilder.test.js` will fail (they test code we're removing)

### 5. Bundle Analysis ✅ VERIFIED

```bash
# Check what's in the bundle
grep -r "SelectionHandler\|ContextBuilder\|DiffExtensionV1" dist/
```

**Result**: No results - these are not in the production bundle

### 6. Import Verification (Optional)

Note: Node.js handles ESM imports differently than Vite. The build works fine with Vite.

If you want to test imports directly with Node.js, you'd need to add `.js` extensions to all imports, but this isn't necessary for the Vite build system.

### 7. Quick Smoke Test

Run this in the browser console on the document editor page:
```javascript
// Quick smoke test
console.log('=== DIFF SYSTEM SMOKE TEST ===');

// Check extension loaded
const hasDiff = window.editor?.extensionManager.extensions.find(e => e.name === 'diffV2');
console.log('1. Diff extension loaded:', !!hasDiff);

// Toggle diff mode
window.editor.commands.toggleDiffMode();
console.log('2. Toggled diff mode - check for errors');

// Check storage
const storage = window.editor.storage.diffV2;
console.log('3. Storage exists:', !!storage);
console.log('4. ChangeManager exists:', !!storage?.changeManager);
console.log('5. OverlayManager exists:', !!storage?.overlayManager);

console.log('=== SMOKE TEST COMPLETE ===');
```

## 🚨 What to Look For

### ✅ Good Signs:
- No build errors ✅
- No console errors about missing modules
- Diff functionality works (Cmd+D toggles mode)
- Changes can be added and highlighted

### ❌ Bad Signs:
- Import errors mentioning `SelectionHandler`, `ContextBuilder`, or `DiffExtensionV1`
- Build failures
- Runtime errors when using diff features

## 📋 Next Steps

If all tests pass, you can safely remove:

1. **Unused source files:**
   - `src/extensions/DiffExtension/DiffExtensionV1.js`
   - `src/extensions/DiffExtension/SelectionHandler.js`
   - `src/services/contextBuilder.js`
   - `src/utils/positionMapping.js`
   - `src/extensions/DiffExtension/manual-test.js`

2. **Test files for unused code:**
   - `src/extensions/DiffExtension/__tests__/SelectionHandler.test.js`
   - `src/services/__tests__/contextBuilder.test.js`

3. **Development artifacts in public/:**
   - All `test-*.js` files (11 files)
   - All `demo*.js` files (2 files)
   - `fix-colors.js`
   - `force-correct-colors.js`

4. **Unused dependency:**
   - Remove `"diff-match-patch": "^1.0.5"` from package.json
   - Run `npm install` to update package-lock.json

## 💡 Quick Rollback

If anything breaks, you can quickly revert:
```bash
git checkout -- src/extensions/DiffExtension/index.js
``` 