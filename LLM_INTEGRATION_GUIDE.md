# LLM Integration Guide - Using the Diff System for AI Suggestions

## Overview

The diff system is perfect for showing LLM-suggested changes. When an LLM wants to modify text, we can visualize the changes and let users accept/reject them.

## The Flow

1. **User selects text** → "hello world"
2. **Send to LLM** → LLM suggests "bye world"
3. **Create diff marks** → Show changes visually
4. **User decides** → Accept (apply change) or Reject (keep original)

## Implementation Pattern

### 1. Parse LLM Response

When the LLM responds with suggested changes, you need to identify what changed:

```javascript
// Example LLM response structure
const llmResponse = {
  original: "hello world",
  suggested: "bye world",
  changes: [
    {
      type: "modification",
      from: 0,
      to: 5,
      originalText: "hello",
      suggestedText: "bye"
    }
  ]
};
```

### 2. Convert to Document Positions

The LLM gives text positions, but we need ProseMirror positions:

```javascript
function findTextInDocument(editor, searchText, startHint = 0) {
  let foundPos = { from: -1, to: -1 };
  
  editor.state.doc.descendants((node, pos) => {
    if (node.isText && node.text.includes(searchText)) {
      const index = node.text.indexOf(searchText);
      foundPos.from = pos + index;
      foundPos.to = pos + index + searchText.length;
      return false; // Stop searching
    }
  });
  
  return foundPos;
}
```

### 3. Apply Diff Marks

Create changes in the diff system:

```javascript
async function applyLLMSuggestions(editor, original, suggested) {
  // Find the original text in the document
  const position = findTextInDocument(editor, original);
  
  if (position.from === -1) {
    console.error('Could not find original text in document');
    return;
  }
  
  // Determine what changed
  const change = {
    type: 'modification',  // Since we're replacing text
    position: position,
    originalText: original,
    suggestedText: suggested,
    metadata: {
      source: 'llm',
      timestamp: new Date().toISOString()
    }
  };
  
  // Add the change to the diff system
  editor.commands.addChange(change);
}
```

## Example: Hello → Bye

Here's a complete example:

```javascript
// Test script for LLM integration
async function testLLMIntegration() {
  const editor = window.editor;
  
  // Enable diff mode
  editor.commands.toggleDiffMode();
  
  // Set initial content
  editor.commands.setContent('<p>hello world</p>');
  
  // Simulate LLM suggestion after a delay
  setTimeout(() => {
    console.log('🤖 LLM suggests: Change "hello" to "bye"');
    
    // Find "hello" in the document
    const position = findTextInDocument(editor, 'hello');
    
    // Create the change
    const change = {
      type: 'modification',
      position: position,
      originalText: 'hello',
      suggestedText: 'bye',
      metadata: {
        source: 'llm-suggestion',
        reason: 'User requested greeting change'
      }
    };
    
    // Apply the change (shows as cyan highlight)
    editor.commands.addChange(change);
    
    console.log('✅ Change marked - click on "hello" to see accept/reject options');
  }, 1000);
}
```

## Visual Styles

For LLM suggestions, the **modification** type (cyan) works best:
- Shows the text that will be replaced
- Clear visual indication of what will change
- Accepting replaces old with new text

## Advanced: Multiple Changes

When LLM suggests multiple changes:

```javascript
function applyMultipleLLMChanges(editor, changes) {
  // Sort changes by position (reverse order to maintain positions)
  const sortedChanges = changes.sort((a, b) => b.from - a.from);
  
  sortedChanges.forEach(change => {
    const position = findTextInDocument(editor, change.originalText);
    
    if (position.from !== -1) {
      editor.commands.addChange({
        type: 'modification',
        position: position,
        originalText: change.originalText,
        suggestedText: change.suggestedText,
        metadata: { source: 'llm-batch' }
      });
    }
  });
}
```

## Integration with AI Chat

Connect to your AI chat component:

```javascript
// In your AI chat handler
const handleAIResponse = (response) => {
  if (response.documentChanges) {
    response.documentChanges.forEach(change => {
      applyLLMSuggestion(editor, change);
    });
  }
};
```

## Best Practices

1. **Always use modification type** for replacements - clearer UX
2. **Batch related changes** - apply multiple changes at once
3. **Include metadata** - track source of changes
4. **Handle position conflicts** - check if text still exists
5. **Provide context** - show why changes are suggested

## Try It Now

```javascript
// Paste in console:
const script = document.createElement('script');
script.text = `
  ${findTextInDocument.toString()}
  ${testLLMIntegration.toString()}
  testLLMIntegration();
`;
document.body.appendChild(script);
```

This will:
1. Add "hello world" to the document
2. Simulate an LLM suggesting "bye" instead of "hello"
3. Show the change with cyan highlighting
4. Allow accept/reject via clicking

## Next Steps

1. **Parse real LLM responses** - Extract changes from API responses
2. **Handle complex edits** - Paragraph rewrites, multiple changes
3. **Show change reasons** - Tooltip with why LLM suggests change
4. **Batch operations** - Accept/reject all LLM suggestions at once 