# AI Diff System - Technical Challenges & Solutions

## 🎯 Overview

This document addresses specific technical challenges you'll face implementing the AI diff system and provides concrete solutions based on your existing codebase and the TipTap/ProseMirror architecture.

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

## 🎨 Challenge 2: Overlapping Changes

### The Problem
You mentioned: *"for overlapping changes, maybe group them, if the bounds overlap just merge the changes into a single thing"*

### Solutions

#### 2.1 Overlap Detection
```javascript
function detectOverlaps(changes) {
  const overlaps = [];
  
  for (let i = 0; i < changes.length; i++) {
    for (let j = i + 1; j < changes.length; j++) {
      const a = changes[i];
      const b = changes[j];
      
      // Check if ranges overlap
      if (a.from < b.to && b.from < a.to) {
        overlaps.push({ a, b, overlap: true });
      }
    }
  }
  
  return overlaps;
}
```

#### 2.2 Smart Merging
```javascript
function mergeOverlappingChanges(changes) {
  // Sort by position
  const sorted = [...changes].sort((a, b) => a.from - b.from);
  const merged = [];
  
  let current = sorted[0];
  
  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    
    if (current.to >= next.from) {
      // Overlapping - merge them
      current = {
        id: `merged-${current.id}-${next.id}`,
        groupId: current.groupId || current.id,
        from: current.from,
        to: Math.max(current.to, next.to),
        type: 'modification', // Merged changes are modifications
        originalText: editor.state.doc.textBetween(
          current.from, 
          Math.max(current.to, next.to)
        ),
        suggestedText: mergeSuggestedText(current, next),
        reason: `Merged: ${current.reason} + ${next.reason}`,
        confidence: Math.min(current.confidence, next.confidence)
      };
    } else {
      merged.push(current);
      current = next;
    }
  }
  
  merged.push(current);
  return merged;
}
```

#### 2.3 Visual Grouping
```javascript
// Use the same overlay for grouped changes
function createGroupedOverlay(groupId, changes) {
  const overlay = new DiffOverlay();
  
  // Associate all changes in group with same overlay
  changes.forEach(change => {
    change.overlayId = groupId;
    change.onAccept = () => acceptGroup(groupId);
    change.onDecline = () => declineGroup(groupId);
  });
  
  return overlay;
}
```

## 🤖 Challenge 3: LLM Response Parsing

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

## 🔄 Challenge 4: Document State Synchronization

### The Problem
When using Vercel → Supabase → Realtime flow, ensuring document state consistency between edits.

### Solutions

#### 4.1 Version Tracking
```javascript
// Track document version to prevent stale edits
class DocumentVersionManager {
  constructor() {
    this.version = 0;
    this.contentHash = null;
  }
  
  updateVersion(content) {
    this.version++;
    this.contentHash = hashContent(content);
  }
  
  validateEdit(edit, currentContent) {
    const currentHash = hashContent(currentContent);
    if (currentHash !== this.contentHash) {
      console.warn('Document has changed since edit was generated');
      return false;
    }
    return true;
  }
}
```

#### 4.2 Optimistic Updates with Rollback
```javascript
// Apply changes optimistically but track for rollback
class OptimisticEditManager {
  constructor(editor) {
    this.editor = editor;
    this.pendingEdits = new Map();
    this.snapshots = new Map();
  }
  
  applyOptimistic(editId, changes) {
    // Take snapshot
    this.snapshots.set(editId, {
      content: this.editor.getHTML(),
      selection: this.editor.state.selection
    });
    
    // Apply changes
    changes.forEach(change => {
      this.editor.commands.addDiffMark(change);
    });
    
    // Track as pending
    this.pendingEdits.set(editId, changes);
  }
  
  confirmEdit(editId) {
    // Remove from pending and snapshot
    this.pendingEdits.delete(editId);
    this.snapshots.delete(editId);
  }
  
  rollbackEdit(editId) {
    const snapshot = this.snapshots.get(editId);
    if (snapshot) {
      this.editor.commands.setContent(snapshot.content);
      this.editor.commands.setSelection(snapshot.selection);
    }
    
    this.pendingEdits.delete(editId);
    this.snapshots.delete(editId);
  }
}
```

## 🎯 Challenge 5: Testing Complex Scenarios

### The Problem
The test script result you showed indicates the system works for basic cases, but complex scenarios need careful testing.

### Solutions

#### 5.1 Comprehensive Test Suite
```javascript
// Create test scenarios that stress the system
const testScenarios = [
  {
    name: "Multiple identical strings",
    document: "The API v1.0 is used. Another v1.0 here. And v1.0 again.",
    instruction: "Update the second v1.0 to v2.0",
    expectedEdit: {
      target: "v1.0",
      occurrences: [2],
      replacement: "v2.0"
    }
  },
  {
    name: "Overlapping changes",
    document: "The old system is slow and the old system crashes.",
    instruction: "Remove 'old system' and update 'slow' to 'fast'",
    expectedEdits: [
      { target: "old system", occurrences: [1, 2], replacement: null },
      { target: "slow", occurrences: [1], replacement: "fast" }
    ]
  },
  {
    name: "Cascading deletions",
    document: "Section A explains X. Based on Section A, we conclude Y.",
    instruction: "Remove Section A",
    expectedCascade: ["section-a-ref-1", "section-a-ref-2"]
  }
];
```

#### 5.2 Position Drift Test
```javascript
// Test that positions remain accurate after changes
async function testPositionDrift() {
  const editor = createTestEditor();
  
  // Add initial content
  editor.commands.setContent('<p>Test one. Test two. Test three.</p>');
  
  // Create marks at known positions
  const positions = findAllOccurrences(editor, "Test");
  console.log('Initial positions:', positions);
  
  // Apply first change
  editor.commands.acceptChange(positions[0]);
  
  // Re-find positions - they should have shifted
  const newPositions = findAllOccurrences(editor, "Test");
  console.log('After first change:', newPositions);
  
  // Verify drift is handled correctly
  assert(newPositions[0].from === positions[1].from - offset);
}
```

## 📋 Implementation Checklist

Based on your requirements and concerns, here's your implementation priority:

1. **Position Accuracy** (Critical)
   - [ ] Implement text validation before mark creation
   - [ ] Add position recovery mechanism
   - [ ] Create comprehensive position tests

2. **Overlap Handling** (Important)
   - [ ] Implement overlap detection
   - [ ] Create merge algorithm
   - [ ] Test with complex overlap scenarios

3. **LLM Integration** (Important)
   - [ ] Add robust JSON parsing
   - [ ] Implement validation layer
   - [ ] Create fallback strategies

4. **Testing Infrastructure** (Critical)
   - [ ] Set up test scenarios
   - [ ] Create position drift tests
   - [ ] Add performance benchmarks

5. **User Safety** (Critical)
   - [ ] Add confirmation for large changes
   - [ ] Implement undo/redo support
   - [ ] Create change preview

## 🎯 Success Indicators

You'll know the system is working when:

1. **Position Accuracy**: 100% of marks appear at intended locations
2. **Overlap Handling**: Overlapping changes merge intelligently
3. **User Trust**: Users confidently accept suggestions
4. **Performance**: < 100ms to create marks after receiving suggestions
5. **Reliability**: 0% data loss or corruption

This technical guide should help you avoid the pitfalls and build a robust, reliable AI diff system. 