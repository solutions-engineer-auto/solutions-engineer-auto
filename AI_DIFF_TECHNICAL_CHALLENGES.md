# AI Diff System - Technical Challenges & Solutions (Revised)

## 🎯 Overview

Since the diff visualization system already works, this document focuses on the remaining technical challenges: getting clean AI suggestions and ensuring position accuracy when creating marks.

## 🚨 Challenge 1: Position Accuracy

### The Problem
Your main concern: *"I'm really worried about it giving me a recommendation I do want, but because it's not properly scoped, it's asking to delete text it doesn't intend on deleting"*

### Solutions

#### 1.1 Exact Text Validation
```javascript
// Before creating any mark, validate the text matches exactly
function validateTextMatch(editor, from, to, expectedText) {
  const actualText = editor.state.doc.textBetween(from, to);
  if (actualText !== expectedText) {
    console.error('Text mismatch!', {
      expected: expectedText,
      actual: actualText,
      from, to
    });
    return false;
  }
  return true;
}
```

#### 1.2 Hash-Based Verification
```javascript
// Include text hash in LLM response for verification
{
  "id": "edit-001",
  "target": "old version",
  "targetHash": "a1b2c3d4", // Simple hash of target
  "replacement": "new version"
}

// Verify before applying
function verifyTarget(text, hash) {
  const computedHash = simpleHash(text);
  return computedHash === hash;
}
```

#### 1.3 Position Recovery Strategy
Based on [[memory:2886768]], use the proven `findMarkPositionById` pattern:

```javascript
// Always look up current positions before operations
function applyEditWithPositionRecovery(editor, edit) {
  const positions = findAllOccurrences(editor, edit.target);
  
  // Store position metadata
  const positionRefs = positions.map((pos, idx) => ({
    index: idx,
    textBefore: editor.state.doc.textBetween(
      Math.max(0, pos.from - 20), 
      pos.from
    ),
    textAfter: editor.state.doc.textBetween(
      pos.to, 
      Math.min(editor.state.doc.content.size, pos.to + 20)
    )
  }));
  
  // Apply edits with fresh position lookup
  edit.occurrences.forEach(occurrenceNum => {
    const freshPositions = findAllOccurrences(editor, edit.target);
    if (freshPositions[occurrenceNum - 1]) {
      createDiffMark(freshPositions[occurrenceNum - 1], edit);
    }
  });
}
```

## 🤖 Challenge 2: AI Response Parsing (Simplified)

### The Problem
The agent uses ChatGPT without tool calls, so responses might not always be perfectly formatted JSON.

### Solutions

#### 3.1 Robust JSON Extraction
```javascript
function extractJsonFromLLMResponse(responseText) {
  // Try direct parse first
  try {
    return JSON.parse(responseText);
  } catch (e) {
    // Fall back to regex extraction
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e2) {
        console.error('Failed to parse extracted JSON');
      }
    }
  }
  
  // Last resort: look for code blocks
  const codeBlockMatch = responseText.match(/```(?:json)?\n([\s\S]*?)\n```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]);
    } catch (e3) {
      console.error('Failed to parse code block JSON');
    }
  }
  
  return null;
}
```

#### 3.2 Response Validation
```javascript
function validateEditResponse(response) {
  const required = ['edits'];
  const errors = [];
  
  // Check required fields
  required.forEach(field => {
    if (!response[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  });
  
  // Validate edits array
  if (response.edits && Array.isArray(response.edits)) {
    response.edits.forEach((edit, idx) => {
      if (!edit.id) errors.push(`Edit ${idx} missing id`);
      if (!edit.type) errors.push(`Edit ${idx} missing type`);
      if (!edit.target && edit.type !== 'addition') {
        errors.push(`Edit ${idx} missing target`);
      }
      if (!edit.occurrences && edit.type !== 'addition') {
        errors.push(`Edit ${idx} missing occurrences`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
```

## 🎯 Challenge 3: Edge Cases in Position Finding

### The Problem
Need to handle edge cases to ensure the right text is always marked.

### Solutions

#### 3.1 Common Edge Cases
```javascript
// Edge cases to handle in position finding
const edgeCases = [
  {
    name: "Partial word matches",
    target: "test",
    document: "testing test tested",
    solution: "Add word boundary checks"
  },
  {
    name: "Special characters",
    target: "function()",
    document: "call function() here",
    solution: "Escape regex special chars"
  },
  {
    name: "Whitespace variations",
    target: "hello world",
    document: "hello  world, hello\nworld",
    solution: "Normalize whitespace"
  }
];

// Enhanced position finder
function findExactOccurrences(editor, target, options = {}) {
  const { wholeWord = false, caseSensitive = true } = options;
  const doc = editor.state.doc;
  const positions = [];
  
  doc.descendants((node, pos) => {
    if (node.isText) {
      const text = caseSensitive ? node.text : node.text.toLowerCase();
      const searchTarget = caseSensitive ? target : target.toLowerCase();
      
      let index = text.indexOf(searchTarget);
      while (index !== -1) {
        // Check word boundaries if needed
        if (wholeWord) {
          const before = index === 0 || /\W/.test(text[index - 1]);
          const after = index + searchTarget.length === text.length || 
                       /\W/.test(text[index + searchTarget.length]);
          
          if (!before || !after) {
            index = text.indexOf(searchTarget, index + 1);
            continue;
          }
        }
        
        positions.push({
          from: pos + index,
          to: pos + index + searchTarget.length
        });
        
        index = text.indexOf(searchTarget, index + 1);
      }
    }
  });
  
  return positions;
}
```

## 📋 Simplified Implementation Checklist

Since the diff system already works, focus on:

1. **AI Integration** (Primary Focus)
   - [ ] Update agent with edit mode
   - [ ] Implement JSON response format
   - [ ] Handle response via realtime

2. **Position Accuracy** (Critical)
   - [ ] Exact text matching
   - [ ] Handle edge cases (partial words, special chars)
   - [ ] Validate before creating marks

3. **JSON Parsing** (Important)
   - [ ] Robust extraction from LLM response
   - [ ] Validation of required fields
   - [ ] Error handling for malformed responses

4. **Testing** (Critical)
   - [ ] Mock AI responses
   - [ ] Position accuracy tests
   - [ ] Edge case coverage

## 🎯 Success Indicators

You'll know it's working when:

1. **AI Suggestions Flow**: Instructions → AI → JSON → Marks
2. **Position Accuracy**: 100% correct text marked
3. **User Confidence**: No fear of wrong changes
4. **Simple Implementation**: Days not weeks

## 🚀 Key Insight

Since your diff visualization (marks, overlays, accept/reject) already works perfectly, this is now just a data pipeline problem:
- Get structured data from AI
- Find exact positions
- Create marks
- Done!

The complex UI problems are already solved. Focus on clean AI integration and accurate position finding. 