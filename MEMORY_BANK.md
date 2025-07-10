# Memory Bank - AI Diff System Implementation

## 🎯 Project Overview
AI-powered document diff system allowing users to:
1. Select text in a document
2. Request AI edits via keyboard shortcut (Cmd/Ctrl + K)
3. See visual diffs with highlights
4. Accept/reject changes with overlay UI

## 📚 Key Files and Their Purpose

### Phase 1 - Frontend Foundation (✅ COMPLETE)
- `src/extensions/DiffExtension/SelectionHandler.js` - Robust position tracking
- `src/services/contextBuilder.js` - Formats API requests
- `src/extensions/DiffExtension/index.js` - Main TipTap extension
- `src/utils/positionMapping.js` - Position anchor utilities

### Phase 2 - Core Diff UI (🔧 IN PROGRESS)
- `src/extensions/DiffExtension/DiffExtensionV2.js` - Mark-based diff system (CORRECT APPROACH)
- `src/extensions/DiffExtension/DiffMark.js` - Visual highlighting marks
- `src/extensions/DiffExtension/DiffOverlay.jsx` - Accept/reject UI
- `src/services/ChangeManagerV2.js` - **MUST BE CREATED** - Manages diff changes

### Integration Point
- `src/pages/DocumentEditorPage.jsx` - Where extensions are registered

## 🔥 Critical Lessons Learned

### 1. Marks vs Decorations
**ALWAYS USE MARKS** - They're part of the document and move with text automatically. Decorations are visual overlays that break with position changes.

### 2. Editor Reference Pattern
```javascript
// ❌ NEVER - Stale reference
onCreate() {
  this.storage.editor = this.editor;
}

// ✅ ALWAYS - Fresh reference
onCreate() {
  this.storage.getEditor = () => this.editor;
}

// In commands - use context
commandName: () => ({ editor }) => {
  // editor is always current here
}
```

### 3. Document Initialization
Always check `editor.state.doc.content.size > 2` before operations. Size 2 = empty doc.

### 4. React 18 Compatibility
```javascript
// Must use createRoot, not ReactDOM.render
import { createRoot } from 'react-dom/client';
const root = createRoot(container);
root.render(<Component />);
```

### 5. Event Handling in Overlays
Use `onMouseDown` with `preventDefault()` and `stopPropagation()`, not `onClick`.

### 6. CSS Injection Timing
Inject styles in `onCreate()` method for visibility.

### 7. Position Validation
Always validate positions before mark operations:
```javascript
const docSize = editor.state.doc.content.size;
if (from < 0 || to > docSize || from > to) {
  return false;
}
```

## 🚨 Common Pitfalls

1. **Storing editor references** - Leads to "docSize=2" errors
2. **Using decorations** - They don't track positions
3. **Wrong React version** - Must use React 18 patterns
4. **Click handlers on overlays** - Use mousedown instead
5. **Missing CSS** - Marks won't be visible
6. **No document check** - Operations fail on empty docs
7. **Complex position math** - Let marks handle it
8. **Double mark application** - Avoid automatic subscriptions

## ✅ What's Currently Working

1. Visual highlights appear (cyan underline) ✅
2. Marks use native TipTap system ✅
3. CSS properly injected ✅
4. Click detection works ✅
5. Overlay positioning with React Portals ✅
6. Accept button applies changes ✅
7. Reject button removes marks ✅
8. Single highlight fully functional ✅
9. React 18 compatibility ✅
10. No transaction errors ✅

## 🔧 What Needs Fixing

1. ~~Create ChangeManagerV2 service~~ ✅ Already existed
2. Support multiple highlights 🔧 (partially working)
3. ~~Implement reject functionality~~ ✅ Fixed
4. ~~Apply accepted changes to document~~ ✅ Fixed
5. Visual feedback for accepted marks ⏳
6. Full Phase 1 integration ⏳
7. Handle overlapping marks ⏳
8. Position updates after changes ⏳

## 🧪 Test Commands

```javascript
// Simple single change test
/test-phase2-simple.js

// Multiple changes test
/test-phase2-multiple.js

// Check current state
/test-phase2-current-state.js

// Original robust test
/test-phase2-robust.js
```

## 🎯 Implementation Strategy

1. **Fix dependencies first** - Create ChangeManagerV2
2. **Get one mark working** - Don't try multiple yet
3. **Test incrementally** - Use manual test scripts
4. **Trust the marks** - They handle positions
5. **Keep it simple** - Complex = bugs

## 📝 API Contract (Phase 1)
```javascript
{
  documentId: string,
  selection: {
    text: string,
    from: number,
    to: number
  },
  instruction: string,
  mode: 'paragraph',
  context: {
    before: string,
    after: string,
    metadata: {}
  },
  quarantineId: string
}
```

## 🚀 Quick Reference

### Enable AI Diff Feature
```javascript
localStorage.setItem('featureFlags', JSON.stringify({ aiDiff: true }));
```

### Test in Console
```javascript
window.editor.commands.toggleDiffMode();
window.editor.commands.addChange({
  type: 'modification',
  originalText: 'old',
  suggestedText: 'new',
  position: { from: 10, to: 13 }
});
```

### Key Memories
- [[memory:2778912]] - Phase 2 implementation critical lessons
- [[memory:2776291]] - TipTap editor reference best practices
- [[memory:2772251]] - AI diff system V2 rewrite details
- [[memory:2768147]] - Empty document handling
- [[memory:2767256]] - ProseMirror position calculations
- [[memory:2779911]] - React Portals for overlay positioning

## 🎓 Final Wisdom

The V2 mark-based approach is architecturally correct. The code exists but needs:
1. Missing ChangeManagerV2 service ✅ (was actually already there)
2. React 18 compatibility fixes ✅ (fixed with createRoot)
3. Proper editor reference patterns ✅ (using command context)
4. Integration with DocumentEditorPage ✅ (already integrated)
5. React Portals for overlays ✅ (better positioning control)

Don't start over. Fix what's there. Trust the marks.
