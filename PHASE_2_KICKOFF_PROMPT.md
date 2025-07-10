# Phase 2: Core Diff UI - Senior React Developer Kickoff Prompt

## 🎯 Executive Summary

You're implementing Phase 2 of our AI Diff System - the visual diff UI with accept/reject functionality. **Critical insight**: Someone already started a V2 implementation using TipTap marks (not decorations) which is the correct approach, but it's incomplete and broken. Your job is to complete it properly.

**Why marks over decorations?** Marks automatically move with text as the document changes, solving 90% of position tracking issues. Decorations require manual position updates and are prone to breaking.

## 🚨 Critical Context You Must Read First

### Required Files to Read (in order):
1. **AI_DIFF_SYSTEM_README.md** - System overview [[memory:2772251]]
2. **src/extensions/DiffExtension/DiffExtensionV2.js** - Existing V2 implementation (INCOMPLETE)
3. **src/extensions/DiffExtension/DiffMark.js** - Mark implementation for highlights
4. **src/extensions/DiffExtension/DiffOverlay.js** - Accept/reject UI overlay
5. **public/test-v2.js** - Test script showing intended functionality
6. **AI_DIFF_FRONTEND_ARCHITECTURE.md** - Technical specifications

### Key Discovery from Investigation
The V2 system exists but is broken because:
- ChangeManager service was deleted but V2 depends on it
- Not integrated with DocumentEditorPage
- No connection to Phase 1 components
- Missing position tracking for overlays

## 🎯 Your Mission

Complete the mark-based diff visualization system that:
1. Highlights changes with colored marks (green=addition, red=deletion, cyan=modification)
2. Shows accept/reject buttons on click/hover
3. Integrates with Phase 1's change data structure
4. Works reliably as text is edited around changes

## 🏗️ Implementation Strategy

### Step 1: Analyze What Exists (Day 1 Morning)
```javascript
// Read these files carefully:
src/extensions/DiffExtension/DiffExtensionV2.js  // Main extension
src/extensions/DiffExtension/DiffMark.js         // Visual marks
src/extensions/DiffExtension/DiffOverlay.js      // UI overlay
public/test-v2.js                                // How it should work
public/test-safe-v2.js                          // Handles empty docs [[memory:2768147]]
```

**What to look for:**
- How marks are created and applied
- How the overlay positioning works
- What's missing for full functionality
- Dependencies on non-existent services

### Step 2: Fix Core Dependencies (Day 1 Afternoon)
```javascript
// Create a minimal ChangeManager that V2 can use
// src/services/ChangeManagerV2.js
export class ChangeManagerV2 {
  constructor() {
    this.changes = new Map();
    this.listeners = new Set();
  }

  addChange(change) {
    this.changes.set(change.id, change);
    this.notifyListeners('change-added', change);
  }

  getChange(id) {
    return this.changes.get(id);
  }

  updateChange(id, updates) {
    const change = this.changes.get(id);
    if (change) {
      Object.assign(change, updates);
      this.notifyListeners('change-updated', change);
    }
  }

  // ... implement other required methods
}
```

### Step 3: Complete the Mark System (Day 2)

**Critical Implementation Rules:**
1. **Use TipTap's native mark system** - Don't try to create custom decorations
2. **Let marks handle position tracking** - They move with text automatically
3. **Keep marks simple** - Just visual indicators, no complex logic

```javascript
// DiffMark.js pattern to follow:
Mark.create({
  name: 'diff',
  
  addAttributes() {
    return {
      type: { default: 'addition' }, // addition, deletion, modification
      changeId: { default: null },
      class: { default: null }
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-diff-type]',
        getAttrs: dom => ({
          type: dom.dataset.diffType,
          changeId: dom.dataset.changeId
        })
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-diff-type': HTMLAttributes.type,
      'data-change-id': HTMLAttributes.changeId,
      class: `diff-${HTMLAttributes.type}`
    }), 0];
  }
});
```

### Step 4: Implement Overlay System (Day 2-3)

**Key Principles for Overlays:**
1. **Position relative to marks** - Use mark DOM elements as anchors
2. **Use React Portals** - Render outside editor but position inside
3. **Handle click events carefully** - Stop propagation to prevent editor focus issues

```javascript
// Pattern for overlay positioning:
function DiffOverlay({ changeId, markElement }) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  useLayoutEffect(() => {
    if (!markElement) return;
    
    const rect = markElement.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });
    
    // Re-position on scroll/resize
    const updatePosition = () => {
      const newRect = markElement.getBoundingClientRect();
      setPosition({
        top: newRect.bottom + window.scrollY,
        left: newRect.left + window.scrollX
      });
    };
    
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [markElement]);
  
  return ReactDOM.createPortal(
    <div 
      className="diff-overlay"
      style={{ 
        position: 'absolute', 
        top: position.top, 
        left: position.left,
        zIndex: 1000 
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent focus loss
    >
      <button onClick={handleAccept}>✓</button>
      <button onClick={handleReject}>✗</button>
    </div>,
    document.body
  );
}
```

## ⚠️ Common Pitfalls and How to Avoid Them

### 1. Position Tracking Issues
**Wrong Way:**
```javascript
// DON'T track positions manually
const positions = new Map();
positions.set(changeId, { from: 10, to: 20 });
```

**Right Way:**
```javascript
// DO use marks which track positions automatically
editor.chain()
  .addMark('diff', { type: 'addition', changeId })
  .run();
```

### 2. Event Handling Conflicts
**Wrong Way:**
```javascript
// DON'T let overlay clicks bubble to editor
<div onClick={handleAccept}>Accept</div>
```

**Right Way:**
```javascript
// DO prevent event propagation [[memory:2533006]]
<div 
  onMouseDown={(e) => {
    e.preventDefault();
    e.stopPropagation();
    handleAccept();
  }}
>
  Accept
</div>
```

### 3. Z-Index and Stacking Issues
**Wrong Way:**
```javascript
// DON'T use arbitrary z-index values
style={{ zIndex: 9999 }}
```

**Right Way:**
```javascript
// DO use consistent z-index system
const Z_INDEX = {
  EDITOR: 1,
  HIGHLIGHTS: 10,
  OVERLAYS: 100,
  MODALS: 1000
};
```

### 4. Memory Leaks
**Wrong Way:**
```javascript
// DON'T forget to clean up event listeners
useEffect(() => {
  window.addEventListener('click', handler);
  // Missing cleanup!
});
```

**Right Way:**
```javascript
// DO always clean up
useEffect(() => {
  window.addEventListener('click', handler);
  return () => window.removeEventListener('click', handler);
}, []);
```

## 🧪 Testing Strategy

### 1. Start with Unit Tests
```javascript
// __tests__/DiffMark.test.js
describe('DiffMark', () => {
  it('should apply mark with correct attributes', () => {
    const editor = createTestEditor();
    editor.chain()
      .setContent('<p>Hello world</p>')
      .setTextSelection({ from: 7, to: 12 }) // "world"
      .addMark('diff', { type: 'addition', changeId: '123' })
      .run();
      
    expect(editor.getHTML()).toContain('data-diff-type="addition"');
    expect(editor.getHTML()).toContain('data-change-id="123"');
  });
});
```

### 2. Use Manual Test Scripts
```javascript
// public/test-phase2-integration.js
// Test the full flow from selection to accept/reject
async function testFullFlow() {
  // 1. Select text
  editor.chain().setTextSelection({ from: 10, to: 20 }).run();
  
  // 2. Create mock change
  const change = {
    id: 'test-123',
    type: 'modification',
    originalText: 'old text',
    suggestedText: 'new text',
    position: { from: 10, to: 20 }
  };
  
  // 3. Apply diff mark
  editor.chain()
    .addMark('diff', { 
      type: change.type, 
      changeId: change.id 
    })
    .run();
  
  // 4. Trigger overlay display
  const markElement = document.querySelector(`[data-change-id="${change.id}"]`);
  markElement.click();
  
  // 5. Verify overlay appears
  await waitFor(() => {
    const overlay = document.querySelector('.diff-overlay');
    expect(overlay).toBeTruthy();
  });
}
```

### 3. Visual Testing Checklist
- [ ] Marks appear with correct colors
- [ ] Overlays position correctly relative to marks
- [ ] Overlays follow marks when text changes
- [ ] Multiple overlapping marks render correctly
- [ ] Accept/reject buttons work
- [ ] No position jumping or flickering
- [ ] Works with empty documents [[memory:2768147]]

## 📁 File Structure

```
src/
├── extensions/
│   └── DiffExtension/
│       ├── DiffExtensionV2.js    // Main extension (fix/complete)
│       ├── DiffMark.js           // Mark definition (enhance)
│       ├── DiffOverlay.js        // Overlay component (complete)
│       └── index.js              // Export V2 instead of V1
├── services/
│   └── ChangeManagerV2.js        // Create this
├── components/
│   └── DiffControls.jsx          // New UI controls
└── pages/
    └── DocumentEditorPage.jsx    // Integrate V2 here
```

## 🚀 Integration with Phase 1

Once Phase 2 is working standalone:

1. **Connect to Phase 1 Selection System**
```javascript
// In DiffExtensionV2
const selection = this.editor.state.selection;
const change = await this.options.onRequestChange(selection);
this.applyDiffMark(change);
```

2. **Wire up to ChangeManager**
```javascript
// When changes arrive from API
changeManager.on('change-added', (change) => {
  editor.chain()
    .setTextSelection(change.position)
    .addMark('diff', { 
      type: change.type, 
      changeId: change.id 
    })
    .run();
});
```

## 🎯 Success Criteria

1. **Visual Quality**
   - Smooth highlights that follow text
   - Clean, accessible accept/reject UI
   - No flickering or position jumping

2. **Technical Robustness**
   - Works with collaborative editing
   - Handles rapid text changes
   - No memory leaks
   - Performant with 100+ changes

3. **Developer Experience**
   - Clean, understandable code
   - Well-tested components
   - Clear integration points

## 💡 Pro Tips

1. **Study the existing test scripts** - They show intended behavior
2. **Use browser DevTools** - Inspect mark elements to understand structure
3. **Test with extreme cases** - Empty docs, 1000+ changes, rapid edits
4. **Keep it simple** - Marks handle the hard part, don't overcomplicate
5. **Ask questions** - If something seems off about V2, it probably is

## 🏁 Getting Started

```bash
# 1. Review the existing V2 code
cat src/extensions/DiffExtension/DiffExtensionV2.js

# 2. Run the existing test to see what works/breaks
open http://localhost:5173/test-v2.html

# 3. Start with fixing ChangeManager dependency
mkdir -p src/services
touch src/services/ChangeManagerV2.js

# 4. Write your first test
touch __tests__/DiffExtensionV2.test.js
```

Remember: The V2 approach using marks is architecturally sound. The main challenges are:
1. Completing the implementation
2. Fixing the missing dependencies  
3. Properly integrating with the rest of the system
4. Ensuring robust event handling and positioning

You're building on a solid foundation - marks are the right choice [[memory:2772251]]. Focus on completing what's there rather than starting over.

Good luck! 🚀 