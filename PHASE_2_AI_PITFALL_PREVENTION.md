# Phase 2: AI Pitfall Prevention Guide

## 🚨 Why This Document Exists

Text highlighting, overlays, and widgets positioned over text are notoriously difficult to implement correctly. Even experienced developers struggle with these features, and AI assistants often fall into predictable traps. This guide explicitly calls out these pitfalls to help you avoid them.

## 🎯 The Golden Rules

### Rule 1: Marks Move, Decorations Don't
**This is the most important concept.** TipTap/ProseMirror offers two ways to highlight text:
- **Marks**: Part of the document, move with text automatically
- **Decorations**: Visual overlays, require manual position updates

**Always use marks for persistent highlights.** The V2 implementation correctly uses marks.

### Rule 2: Don't Fight the Framework
TipTap handles position tracking for you through marks. Don't try to:
- Track positions manually in state
- Calculate offsets yourself
- Build your own position mapping system

### Rule 3: Test with a Changing Document
Most overlay bugs only appear when the document changes. Always test:
- Adding text before your highlights
- Deleting text around highlights
- Collaborative editing scenarios

## ❌ Common AI Implementation Mistakes

### Mistake 1: Using Absolute Positions
```javascript
// ❌ WRONG - AI often generates this
const [positions, setPositions] = useState({
  change1: { from: 10, to: 20 },
  change2: { from: 30, to: 40 }
});

// These positions become invalid as soon as text changes!
```

```javascript
// ✅ RIGHT - Let marks handle it
editor.chain()
  .addMark('diff', { changeId: 'change1', type: 'addition' })
  .run();

// Position is tracked automatically by TipTap
```

### Mistake 2: Creating Custom Decoration Systems
```javascript
// ❌ WRONG - AI loves to overcomplicate
class CustomHighlightManager {
  constructor() {
    this.decorations = [];
    this.positions = new Map();
  }
  
  updatePositions(tr) {
    // Complex position mapping logic...
  }
}
```

```javascript
// ✅ RIGHT - Use TipTap's built-in marks
const DiffMark = Mark.create({
  name: 'diff',
  // Simple configuration, TipTap handles the rest
});
```

### Mistake 3: Incorrect Event Handling
```javascript
// ❌ WRONG - Causes focus issues
<div className="overlay" onClick={handleAccept}>
  Accept
</div>
```

```javascript
// ✅ RIGHT - Prevents editor focus loss
<div 
  className="overlay" 
  onMouseDown={(e) => {
    e.preventDefault(); // Critical!
    e.stopPropagation();
    handleAccept();
  }}
>
  Accept
</div>
```

### Mistake 4: Positioning Overlays with Static Coordinates
```javascript
// ❌ WRONG - Breaks on scroll/resize
const [overlayPos] = useState({ top: 100, left: 200 });

return (
  <div style={{ position: 'absolute', ...overlayPos }}>
    Overlay
  </div>
);
```

```javascript
// ✅ RIGHT - Dynamic positioning
useLayoutEffect(() => {
  const updatePosition = () => {
    const rect = markElement.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });
  };
  
  updatePosition();
  window.addEventListener('scroll', updatePosition);
  window.addEventListener('resize', updatePosition);
  
  return () => {
    window.removeEventListener('scroll', updatePosition);
    window.removeEventListener('resize', updatePosition);
  };
}, [markElement]);
```

### Mistake 5: Memory Leaks in Overlay Components
```javascript
// ❌ WRONG - AI often forgets cleanup
useEffect(() => {
  const handler = () => console.log('clicked');
  document.addEventListener('click', handler);
  // No cleanup!
});
```

```javascript
// ✅ RIGHT - Always clean up
useEffect(() => {
  const handler = () => console.log('clicked');
  document.addEventListener('click', handler);
  
  return () => {
    document.removeEventListener('click', handler);
  };
}, []);
```

## 🛡️ Defensive Coding Patterns

### Pattern 1: Null-Safe Mark Queries
```javascript
// Always check if marks exist before using them
const getMarkElement = (changeId) => {
  const element = document.querySelector(`[data-change-id="${changeId}"]`);
  if (!element) {
    console.warn(`Mark element not found for change ${changeId}`);
    return null;
  }
  return element;
};
```

### Pattern 2: Graceful Degradation
```javascript
// If overlay positioning fails, don't crash
const DiffOverlay = ({ changeId }) => {
  const element = getMarkElement(changeId);
  
  if (!element) {
    // Fallback UI or return null
    return null;
  }
  
  // Normal rendering...
};
```

### Pattern 3: Debounced Updates
```javascript
// Prevent performance issues with rapid updates
const updateOverlayPosition = useMemo(
  () => debounce((element) => {
    const rect = element.getBoundingClientRect();
    setPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX
    });
  }, 16), // ~60fps
  []
);
```

## 🔍 How to Verify Your Implementation

### Quick Smoke Tests
1. **Position Stability Test**
   - Add a highlight to some text
   - Type before the highlighted text
   - Highlight should stay on the same words

2. **Overlay Follow Test**
   - Click a highlight to show overlay
   - Scroll the page
   - Overlay should follow the highlight

3. **Memory Leak Test**
   - Open browser DevTools Memory profiler
   - Add/remove 100 highlights
   - Memory should return to baseline

### Red Flags in Generated Code
If you see any of these patterns, the implementation is likely wrong:
- Manual position calculations with `from/to` numbers
- Complex position mapping functions
- Custom decoration management systems
- `setInterval` for position updates (use event listeners)
- Direct DOM manipulation outside React

## 📋 Implementation Checklist

Before considering your implementation complete:

- [ ] Highlights use TipTap marks, not decorations
- [ ] No manual position tracking in component state
- [ ] All event listeners are cleaned up
- [ ] Overlay positioning uses scroll/resize listeners
- [ ] Click handlers use `onMouseDown` with `preventDefault()`
- [ ] Works correctly when text is added/removed before highlights
- [ ] No memory leaks (check with DevTools)
- [ ] Overlays render via React Portal
- [ ] Z-index values use a consistent system
- [ ] Error boundaries protect against null mark elements

## 🎓 Understanding Why Marks Work

Marks succeed where decorations fail because:

1. **They're part of the document model** - When text moves, marks move with it
2. **TipTap handles the complexity** - Position remapping happens automatically
3. **They persist across transactions** - No need to recalculate after each change
4. **They're collaborative-ready** - Work with real-time multi-user editing

This is why the V2 approach is correct, despite being incomplete.

## 🚀 Final Advice

1. **Trust the framework** - TipTap has solved these problems
2. **Keep it simple** - The simplest solution is usually correct
3. **Test dynamically** - Static documents hide most bugs
4. **Read the V2 code carefully** - It has the right architecture
5. **When in doubt, console.log** - See what TipTap is actually doing

Remember: If your solution involves tracking positions manually, calculating offsets, or building complex mapping systems, you're probably on the wrong track. The mark-based approach handles all of this for you. 