# Phase 2: AI Diff System - SMART Implementation Kickoff

## 🎯 Mission Critical Context

You're implementing Phase 2 of an AI-powered document diff system. **THE V2 IMPLEMENTATION ALREADY EXISTS** using the correct approach (TipTap marks), but it's broken. Your job is to fix and complete it, NOT start over.

### 🔥 What We've Learned (The Hard Way)

1. **Marks > Decorations** - Always. No exceptions. Marks move with text automatically.
2. **Editor references are tricky** - NEVER store `this.editor` during `onCreate()`
3. **The code exists** - DiffExtensionV2.js, DiffMark.js, DiffOverlay.jsx are there
4. **Missing dependency** - ChangeManagerV2 needs to be created
5. **React 18 matters** - Use `createRoot()`, not `ReactDOM.render()`

## 📁 Required Reading (IN THIS ORDER)

1. **src/extensions/DiffExtension/DiffExtensionV2.js** - The main extension (broken but correct approach)
2. **src/extensions/DiffExtension/DiffMark.js** - Mark implementation for highlights
3. **src/extensions/DiffExtension/DiffOverlay.jsx** - Accept/reject UI (needs React 18 fix)
4. **src/services/ChangeManagerV2.js** - DOES NOT EXIST - you must create it
5. **src/pages/DocumentEditorPage.jsx** - Where to integrate the extension

## ✅ Current Working State

After extensive debugging, here's what works:
- Visual highlights appear (cyan underline on modified text)
- Marks use TipTap's native system
- CSS styles are injected and visible
- Click detection on marks works
- Overlay positioning system is ready
- Accept button doesn't crash (after simplification)

## 🚨 Critical Implementation Rules

### Rule 1: Editor References
```javascript
// ❌ NEVER DO THIS
onCreate() {
  this.storage.editor = this.editor; // STALE REFERENCE!
}

// ✅ ALWAYS DO THIS
onCreate() {
  this.storage.getEditor = () => this.editor; // Returns current editor
}

// In commands:
addChange: (change) => ({ editor }) => {
  // Use editor from context, not stored reference
  editor.commands.something();
}
```

### Rule 2: Document Initialization
```javascript
// Always check document is ready
if (editor.state.doc.content.size <= 2) {
  console.warn('Document not initialized');
  return;
}
```

### Rule 3: React 18 Compatibility
```javascript
// ❌ OLD WAY
ReactDOM.render(<Component />, container);

// ✅ NEW WAY
import { createRoot } from 'react-dom/client';
const root = createRoot(container);
root.render(<Component />);
```

### Rule 4: Event Handling
```javascript
// ❌ onClick loses editor focus
<button onClick={handleAccept}>Accept</button>

// ✅ onMouseDown preserves focus
<button onMouseDown={(e) => {
  e.preventDefault();
  e.stopPropagation();
  handleAccept();
}}>Accept</button>
```

## 🎯 Implementation Steps

### Step 1: Create ChangeManagerV2 (FIRST PRIORITY)
```javascript
// src/services/ChangeManagerV2.js
export class ChangeManagerV2 {
  constructor() {
    this.changes = new Map();
    this.listeners = new Set();
  }

  addChange(change) {
    // Ensure change has an ID
    if (!change.id) {
      change.id = `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    this.changes.set(change.id, { ...change, status: 'pending' });
    this.notifyListeners('change-added', change);
    return change.id;
  }

  getChange(id) {
    return this.changes.get(id);
  }

  getChanges(filter = {}) {
    const allChanges = Array.from(this.changes.values());
    if (filter.status) {
      return allChanges.filter(c => c.status === filter.status);
    }
    return allChanges;
  }

  acceptChange(id) {
    const change = this.changes.get(id);
    if (change) {
      change.status = 'accepted';
      this.notifyListeners('change-accepted', change);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(cb => cb(event, data));
  }
}
```

### Step 2: Fix DiffExtensionV2.js Critical Issues

1. **Import the new ChangeManagerV2**
2. **Fix editor reference pattern**
3. **Ensure CSS injection happens**
4. **Integrate with DocumentEditorPage**

### Step 3: Update DiffOverlay.jsx for React 18

1. **Change import to use createRoot**
2. **Fix event handlers to use onMouseDown**
3. **Ensure proper cleanup on unmount**

### Step 4: Integration Points

In DocumentEditorPage.jsx:
```javascript
// Add to extensions array
extensions: [
  // ... other extensions
  ...(featureFlags.aiDiff ? [
    DiffExtension.configure({
      onRequestEdit: handleAIEditRequest,
      onAcceptChange: handleAcceptChange,
      onRejectChange: handleRejectChange
    })
  ] : [])
]
```

## 🧪 Testing Approach

### Create Simple Test First
```javascript
// public/test-simple-phase2.js
console.log('Testing Phase 2...');

const checkReady = setInterval(() => {
  const editor = window.editor;
  if (editor && editor.state.doc.content.size > 2) {
    clearInterval(checkReady);
    
    // Enable diff mode
    editor.commands.toggleDiffMode();
    
    // Add a single test change
    editor.commands.addChange({
      type: 'modification',
      originalText: 'TEMPLATE:',
      suggestedText: 'MODIFIED:',
      position: { from: 1, to: 11 }
    });
    
    console.log('✅ If you see a cyan highlight, it works!');
  }
}, 100);
```

## ⚠️ Common Pitfalls to Avoid

1. **Don't try to track positions manually** - Marks handle this
2. **Don't use decorations** - They're broken for this use case
3. **Don't store editor references** - Always get fresh from context
4. **Don't overcomplicate** - Get one mark working first
5. **Don't ignore document initialization** - Check size > 2
6. **Don't use deprecated React APIs** - Use React 18 patterns

## 🎯 Success Metrics

You'll know Phase 2 is complete when:
1. ✅ Text highlights appear when changes are added
2. ✅ Clicking a highlight shows accept/reject overlay
3. ✅ Accept/reject buttons work without errors
4. ✅ Multiple highlights can coexist
5. ✅ Highlights survive text edits around them
6. ✅ Integration with Phase 1 selection system works

## 💡 Pro Tips from Experience

1. **Start with the test script** - Get visual feedback immediately
2. **Use console.log liberally** - Track what's happening
3. **Check the DOM** - Use DevTools to inspect mark elements
4. **One change at a time** - Don't try to fix everything at once
5. **Trust the marks** - They really do handle position tracking

## 🚀 Quick Start Commands

```bash
# 1. Start the dev server
npm run dev

# 2. Open browser console
# 3. Run test script
/test-simple-phase2.js

# 4. Look for cyan highlight
# 5. Click it
# 6. See overlay appear
```

Remember: The V2 approach is correct. The code exists. It just needs to be fixed and completed. Don't start over! 