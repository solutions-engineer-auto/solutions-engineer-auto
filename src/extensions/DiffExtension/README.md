# DiffExtension - AI-Powered Document Diff System

## Overview

The DiffExtension is a TipTap extension that provides AI-powered diff functionality for document editing. It enables users to:
- Select text and request AI edits (Phase 1 ✅)
- Visualize changes with colored highlights (Phase 2 ✅)
- Accept or reject individual changes via interactive UI (Phase 2 ✅)
- Manage multiple changes in batches (Phase 2 ✅)

## Architecture

### Phase 1: Foundation (Complete)
- **SelectionHandler**: Manages text selection with quarantine zones
- **ContextBuilder**: Extracts context for AI requests
- **Position Tracking**: Maintains stable references as document changes

### Phase 2: Visual Diff UI (Complete)
- **Mark-Based Highlights**: Uses TipTap marks for automatic position tracking
- **Interactive Overlays**: React-based accept/reject UI
- **Change Management**: Tracks change state and history

## Implementation Details

### Why Marks Over Decorations?

The V2 implementation uses TipTap marks instead of decorations because:
1. **Automatic Position Tracking**: Marks move with text automatically
2. **Persistence**: Marks are part of the document model
3. **Simplicity**: No manual position mapping required
4. **Collaboration Ready**: Works with real-time editing

### Key Components

#### DiffExtensionV2
The main extension that:
- Manages diff mode state
- Provides commands for change management
- Integrates sub-extensions (DiffMark)
- Handles keyboard shortcuts

#### DiffMark
A TipTap mark that:
- Renders visual highlights (green/red/cyan)
- Stores change metadata
- Provides click targets for interaction

#### DiffOverlay
React component that:
- Shows accept/reject buttons
- Uses portals for proper positioning
- Follows marks during scroll/resize
- Handles click events properly

#### ChangeManagerV2
Service that:
- Stores changes in memory
- Notifies listeners of updates
- Provides filtering and statistics
- Manages change lifecycle

## Usage

### Basic Setup

```javascript
import { DiffExtension } from '../extensions/DiffExtension'
import { DIFF_ENABLED } from '../utils/featureFlags'

const editor = useEditor({
  extensions: [
    // ... other extensions
    DIFF_ENABLED ? DiffExtension.configure({
      onRequestEdit: handleAIEditRequest,
      onAcceptChange: handleAcceptChange,
      onRejectChange: handleRejectChange
    }) : null
  ].filter(Boolean)
})
```

### Commands

```javascript
// Toggle diff mode on/off
editor.commands.toggleDiffMode()

// Add a single change
editor.commands.addChange({
  type: 'modification', // or 'addition', 'deletion'
  position: { from: 10, to: 20 },
  originalText: 'old text',
  suggestedText: 'new text',
  confidence: 0.9,
  reasoning: 'Improved clarity'
})

// Add multiple changes
editor.commands.addChangeBatch('batch-123', [
  { type: 'addition', ... },
  { type: 'deletion', ... }
])

// Accept/reject changes
editor.commands.acceptChange(changeId)
editor.commands.rejectChange(changeId)

// Batch operations
editor.commands.acceptAllChanges()
editor.commands.rejectAllChanges()

// Apply accepted changes to document
editor.commands.applyAcceptedChanges()
```

### Keyboard Shortcuts

- **Cmd/Ctrl + K**: Request AI edit on selection
- **Cmd/Ctrl + D**: Toggle diff mode
- **Click on highlight**: Show accept/reject buttons

## Testing

### Manual Testing

1. Open the document editor
2. Enable diff mode with Cmd+D
3. Run the test script in console:
```javascript
const script = document.createElement('script')
script.src = '/test-phase2-integration.js'
document.head.appendChild(script)
```

### Test Helpers

Once the test script loads, use these helpers:
```javascript
diffTest.acceptFirst()    // Accept first pending change
diffTest.rejectFirst()    // Reject first pending change
diffTest.acceptAll()      // Accept all pending changes
diffTest.rejectAll()      // Reject all pending changes
diffTest.applyAccepted()  // Apply accepted changes
diffTest.getStats()       // View statistics
diffTest.listChanges()    // List all changes
```

## Styling

The extension includes CSS for:
- Highlight colors (green/red/cyan)
- Hover effects
- Glassmorphic overlay design
- Smooth transitions

### Customization

Override CSS variables to customize appearance:
```css
:root {
  --diff-addition-color: #22c55e;
  --diff-deletion-color: #ef4444;
  --diff-modification-color: #06b6d4;
}
```

## Position Tracking

The system uses multiple layers of position tracking:

1. **Marks**: Primary tracking via TipTap's mark system
2. **Change Manager**: Stores original positions
3. **Position Anchors**: Fallback for complex scenarios

## Error Handling

The extension handles:
- Invalid positions gracefully
- Missing DOM elements
- Memory cleanup on destroy
- Event listener management

## Performance Considerations

- Debounced position updates (60fps)
- Efficient DOM queries
- Proper cleanup to prevent memory leaks
- Minimal re-renders

## Future Enhancements (Phase 3)

- [ ] API integration for AI suggestions
- [ ] Real-time collaboration support
- [ ] Persistent change history
- [ ] Advanced keyboard navigation
- [ ] Change templates
- [ ] Bulk operations UI

## Common Issues and Solutions

### Marks Not Visible
- Check if diff mode is enabled
- Verify positions are within document bounds
- Ensure CSS is loaded

### Overlay Position Issues
- Check scroll parent detection
- Verify React portal mounting
- Test with different viewport sizes

### Memory Leaks
- Ensure all event listeners are cleaned up
- Check that subscriptions are unsubscribed
- Verify overlay components unmount

## Architecture Decisions

### Mark-Based Approach
We chose marks over decorations because:
- Marks handle position tracking automatically
- Better performance with document changes
- Simpler implementation
- Works with collaborative editing

### React Overlays
We use React for overlays because:
- Better state management
- Smooth animations
- Portal support for z-index management
- Component reusability

### Event Handling
We use mousedown instead of click because:
- Prevents editor focus loss
- Better control over event flow
- Consistent behavior across browsers

## Contributing

When adding features:
1. Maintain mark-based architecture
2. Test with changing documents
3. Handle edge cases gracefully
4. Update documentation
5. Add test coverage

## License

Part of the SE Automation MVP Frontend project. 