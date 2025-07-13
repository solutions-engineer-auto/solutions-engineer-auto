# AI Diff System - LLM Response Format Specification

## 🎯 Overview

This document defines how the LLM (ChatGPT) should format edit suggestions for the diff system. Based on your requirements, we'll provide two formats: a primary format optimized for the mark system, and a backup format for higher accuracy.

## 📊 Primary Format: Index-Based Changes

This format is designed to work seamlessly with the current mark/diff implementation.

### Structure

```json
{
  "edits": [
    {
      "id": "edit-001",
      "type": "modification",  // "modification" | "deletion" | "addition"
      "target": "v1.0",       // The text to find
      "replacement": "v2.0",   // What to replace it with (null for deletion)
      "occurrences": [1, 3, 5, 7, 8, 9],  // Which occurrences to change (1-based)
      "confidence": 0.95,
      "reason": "Update API version references to latest"
    },
    {
      "id": "edit-002",
      "type": "deletion",
      "target": "This feature is deprecated.",
      "replacement": null,
      "occurrences": [1, 2],  // Delete the 1st and 2nd occurrences
      "confidence": 0.90,
      "reason": "Remove deprecation warnings as requested"
    },
    {
      "id": "edit-003", 
      "type": "addition",
      "afterText": "Introduction",  // Add after this text
      "occurrence": 1,              // After the 1st occurrence
      "insertion": "\n\nNote: This document reflects the latest product updates.",
      "confidence": 0.85,
      "reason": "Add update notice to introduction"
    }
  ],
  "summary": "Updated 6 version references and removed 2 deprecation warnings"
}
```

### How It Works

1. **Find all occurrences** of the target text
2. **Apply changes only to specified indices** (1-based for human readability)
3. **Group related changes** under a single edit ID
4. **Tie changes together** for accept/reject as a unit

### Example Usage

User: "Update all mentions of v1.0 to v2.0 in the API sections only"

LLM analyzes and finds v1.0 appears 12 times total, but only at positions 1, 3, 5, 7, 8, 9 are in API sections.

## 📊 Backup Format: Context-Based Changes

More accurate but requires sophisticated position finding. Use when precision is critical.

### Structure

```json
{
  "contextualEdits": [
    {
      "id": "ctx-001",
      "type": "modification",
      "searchPattern": {
        "before": "The API endpoint uses ",
        "target": "v1.0",
        "after": " for authentication"
      },
      "replacement": "v2.0",
      "confidence": 0.98,
      "lineHint": "approximately line 45-50",
      "reason": "Update API version in authentication section"
    },
    {
      "id": "ctx-002", 
      "type": "modification",
      "searchPattern": {
        "paragraph": "contains('REST API') && contains('version')",
        "target": "v1.0",
        "maxDistance": 50  // Within 50 chars of 'REST API'
      },
      "replacement": "v2.0",
      "all": true,  // Apply to all matches in this context
      "confidence": 0.92,
      "reason": "Update all API versions in REST documentation"
    }
  ]
}
```

## 🔄 Change Cascading Rules

When changes affect other changes:

```json
{
  "edits": [
    {
      "id": "edit-001",
      "type": "deletion",
      "target": "The old system",
      "replacement": null,
      "occurrences": [1],
      "cascades": ["edit-002", "edit-003"]  // These edits depend on this text
    },
    {
      "id": "edit-002",
      "type": "modification",
      "target": "old system's performance",
      "replacement": "new system's performance",
      "occurrences": [1],
      "dependsOn": "edit-001"  // Will be cancelled if edit-001 is accepted
    }
  ]
}
```

## 🤖 Prompt Engineering for Agents

### System Prompt Addition

```
When suggesting document edits:
1. Return responses in the structured JSON format specified
2. Use 1-based indexing for occurrences (first occurrence = 1)
3. Group related changes under single edit IDs
4. Include confidence scores (0-1) based on context clarity
5. For additions, specify afterText with occurrence number
6. For complex edits, provide both primary and contextual formats
```

### Example Interaction

**User**: "Remove all mentions of the legacy authentication system"

**Agent Analysis**:
1. Scan document for "legacy", "old", "deprecated" + "authentication"
2. Identify 5 instances across different sections
3. Group into logical edit units

**Agent Response**:
```json
{
  "edits": [
    {
      "id": "edit-001",
      "type": "deletion",
      "target": "The legacy authentication system uses OAuth 1.0.",
      "replacement": null,
      "occurrences": [1],
      "confidence": 0.95,
      "reason": "Remove legacy auth description"
    },
    {
      "id": "edit-002", 
      "type": "modification",
      "target": "supports both modern and legacy authentication",
      "replacement": "supports modern authentication",
      "occurrences": [1, 2],
      "confidence": 0.90,
      "reason": "Remove legacy auth references"
    }
  ],
  "contextualEdits": [
    {
      "id": "ctx-001",
      "type": "deletion",
      "searchPattern": {
        "paragraph": "contains('authentication') && contains('legacy')",
        "sentences": 2  // Delete 2 sentences matching this pattern
      },
      "confidence": 0.88,
      "reason": "Remove detailed legacy auth documentation"
    }
  ]
}
```

## 🎯 Implementation Strategy

### Phase 1: Primary Format Only
- Start with index-based approach
- Simpler to implement and test
- Handles 90% of use cases

### Phase 2: Context-Based Fallback
- Add when precision issues arise
- Use for complex documents
- Better for ambiguous targets

### Position Finding Algorithm

```javascript
// For primary format
function applyIndexBasedEdit(editor, edit) {
  const positions = findAllOccurrences(editor, edit.target);
  
  // Apply only to specified indices (convert to 0-based)
  edit.occurrences.forEach(oneBasedIndex => {
    const index = oneBasedIndex - 1;
    if (positions[index]) {
      createDiffMark(positions[index], edit);
    }
  });
}

// For backup format
function applyContextualEdit(editor, edit) {
  const matches = findWithContext(editor, edit.searchPattern);
  matches.forEach(match => createDiffMark(match, edit));
}
```

## ⚠️ Critical Considerations

1. **One-Based Indexing**: LLM uses 1-based (human-friendly), code uses 0-based
2. **Position Stability**: Always use findMarkPositionById before accepting changes
3. **Grouped Changes**: All occurrences in an edit share the same overlay
4. **Cascading**: Track dependencies between edits
5. **Confidence Threshold**: Only show changes above 0.7 confidence by default

## 🔍 Testing the Format

```javascript
// Test data for development
const mockLLMResponse = {
  edits: [
    {
      id: "edit-001",
      type: "modification",
      target: "test",
      replacement: "TEST",
      occurrences: [2, 4, 5],  // Change 2nd, 4th, and 5th occurrences
      confidence: 0.95,
      reason: "Capitalize specific instances"
    }
  ]
};
```

This format provides clear, structured data that maps directly to your diff mark system while maintaining flexibility for complex edits. 