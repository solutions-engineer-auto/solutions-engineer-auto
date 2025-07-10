# Debug Diff Button

## Overview

A temporary debug button has been added to the document editor toolbar to help test the diff system without needing LLM integration.

## Location

The button appears in the formatting toolbar when:
1. The AI Diff feature is enabled (`localStorage.setItem('featureFlags', JSON.stringify({ aiDiff: true }))`)
2. The document is not finalized

Look for: **🧪 Test Diff**

## How to Use

1. **Select some text** in the editor
2. **Click the "🧪 Test Diff" button**
3. The system will:
   - Enable diff mode (if not already enabled)
   - Create a cyan highlight on your selected text
   - Set up a change to replace the text with "TEST"
4. **Click on the highlighted text** to see the overlay
5. The overlay will show:
   - Original text in red
   - "TEST" as the suggested replacement in green
   - Confirm/Decline buttons
6. **Click "Confirm"** to replace the text with "TEST"
7. **Click "Decline"** to keep the original text

## Console Output

When you click the button, it logs:
```javascript
Debug diff created: {
  from: [start position],
  to: [end position],
  original: "[your selected text]",
  suggested: "TEST"
}
```

## Purpose

This button allows you to:
- Test the diff system's visual highlights
- Verify the overlay UI works correctly
- Test accept/reject functionality
- Debug position tracking
- Ensure the mark system is working properly

## Removal

This is a temporary debug feature. To remove it, delete the section marked:
```javascript
{/* Temporary Debug Button for Diff Testing */}
```
in `src/pages/DocumentEditorPage.jsx` (around line 753-800). 