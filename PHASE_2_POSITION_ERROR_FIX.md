# Phase 2: ProseMirror Position Error Fix

## 🐛 The Root Cause of All Our Problems

The persistent "RangeError: Applying a mismatched transaction" errors were caused by incorrect position calculations!

## 🔍 The Problem

All our test scripts were calculating positions based on plain text strings:
```javascript
// WRONG! This assumes positions start at 0
const testContent = 'The quick brown fox...';
position: { from: 4, to: 9 }  // "quick" in plain text
```

But ProseMirror has a different position system:
```
<doc>            // position 0
  <paragraph>    // position 1
    The quick... // text starts at position 1
  </paragraph>   
</doc>           // position 71
```

## 📊 Position Mapping

For text "The quick brown fox":
- Plain text: "quick" is at positions 4-9
- ProseMirror: "quick" is at positions 5-10

**All positions were off by 1!**

## ✅ The Solution

Use ProseMirror's `descendants()` to find correct positions:
```javascript
function findTextPosition(searchText) {
  let result = null;
  
  doc.descendants((node, pos) => {
    if (node.isText && node.text.includes(searchText)) {
      const index = node.text.indexOf(searchText);
      result = {
        from: pos + index,
        to: pos + index + searchText.length
      };
      return false; // Stop searching
    }
  });
  
  return result;
}
```

## 🧪 Fixed Test Script

Run the corrected test:
```bash
/test-github-style-fixed.js
```

This test:
1. Uses proper ProseMirror position calculation
2. Shows document structure
3. No more transaction errors!
4. Marks appear with correct colors

## 🎯 Key Lessons

1. **Never use string positions directly** - They don't account for document structure
2. **Always use doc.descendants()** - It gives you the correct ProseMirror positions
3. **Debug with fixedGitHub.debugDoc()** - Shows actual document structure
4. **The green highlights were a symptom** - Failed marks defaulted to green

## 🔧 Debug Helpers

```javascript
// Show document structure and positions
fixedGitHub.debugDoc()

// Create change with correct positions
fixedGitHub.createChangeForWord('quick', 'modification')

// Show position mapping
fixedGitHub.showPositions()
```

## 🚀 Impact

This fixes:
- ✅ No more "mismatched transaction" errors
- ✅ Marks apply correctly
- ✅ Colors display properly (red/cyan/green)
- ✅ Accept/reject works as expected
- ✅ Multiple changes work

The entire Phase 2 implementation was correct - we were just using wrong positions in our tests! 