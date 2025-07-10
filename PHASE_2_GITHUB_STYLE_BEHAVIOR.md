# Phase 2: GitHub/Cursor-Style Accept/Reject Behavior

## ✅ Implementation Complete

The AI diff system now implements GitHub/Cursor-style accept/reject behavior, where:
- **Accept**: Applies the suggested changes
- **Reject**: Reverts to the original text

## 🎯 Key Behavior Changes

### Accept (Keep Changes)
When you accept a change:
- **Modifications**: Replace original text with suggested text
- **Deletions**: Remove the text (keep it deleted)
- **Additions**: Keep the added text

### Reject (Revert Changes)
When you reject a change:
- **Modifications**: Restore original text
- **Deletions**: Restore the deleted text
- **Additions**: Remove the added text

## 🔧 Technical Implementation

### Modified `rejectChange` Command
The key change was transforming `rejectChange` from just removing highlights to actually reverting changes:

```javascript
// OLD: Just removed the mark
tr.removeMark(from, to, editor.schema.marks.diffMark)

// NEW: Reverts the change based on type
if (change.type === 'deletion') {
  // Restore deleted text
  editor.chain().insertContentAt(from, change.originalText).run()
} else if (change.type === 'modification') {
  // Replace suggested with original
  editor.chain()
    .deleteRange({ from, to })
    .insertContentAt(from, change.originalText)
    .run()
}
```

### Position Tracking Updates
After accept/reject, positions of remaining changes are adjusted:
- Calculate offset based on text length changes
- Update all changes that come after the modified position
- Re-apply marks with corrected positions

## 🧪 Test It

Run the GitHub-style test:
```bash
/test-github-style-diff.js
```

Or manually test:
```javascript
// Create a deletion
githubTest.createDeletion()
// Click the red highlight and reject - text is restored!

// Create a modification  
githubTest.createModification()
// Accept keeps uppercase, reject restores original
```

## 📊 Visual Indicators

- **Cyan highlight + underline**: Modification
- **Red highlight + strikethrough**: Deletion
- **Green highlight + underline**: Addition (future)

## 🎨 User Experience

This matches the familiar GitHub pull request experience:
1. See what will change (highlighted)
2. Accept to apply the change
3. Reject to keep original
4. Visual feedback shows current state

## ⚠️ Current Limitation

**Additions**: ProseMirror marks cannot be applied to zero-width ranges (insertion points). For now, additions would need:
- Alternative visualization (decorations/overlays)
- Placeholder characters with marks
- Or different UI approach

The current implementation focuses on modifications and deletions which work perfectly with marks.

## 🚀 Next Steps

1. Implement addition support using decorations or placeholders
2. Add batch accept/reject for all changes
3. Add keyboard shortcuts for accept/reject
4. Integrate with AI suggestions from Phase 1 