# Phase 4 Position Bug Fix - Quick Start Guide

## 🚀 Let's Fix This Bug Right Now!

You have everything you need in **PHASE_4_POSITION_BUG_FIX_KICKOFF.md**. Here's your quick action plan:

## Step 1: Understand the Bug (5 minutes)
```bash
# See the bug in action
open http://localhost:5182
# 1. Create document with text
# 2. Use debug button to add 2+ changes
# 3. Accept first change
# 4. Try accepting second → RangeError!
```

## Step 2: Write the Test First (15 minutes)
```bash
# Create the test file
mkdir -p src/services/__tests__
touch src/services/__tests__/ChangeManagerV2.position.test.js

# Copy the test template from the kickoff doc
# Run tests in watch mode
npm test -- --watch ChangeManagerV2.position
```

## Step 3: Implement Position Tracking (30 minutes)
```bash
# Open the ChangeManagerV2 file
code src/services/ChangeManagerV2.js

# Add the three new methods:
# - calculatePositionDelta()
# - updatePositionsAfter() 
# - getAdjustedPosition()
```

## Step 4: Update Accept/Reject Commands (20 minutes)
```bash
# Open DiffExtensionV2
code src/extensions/DiffExtension/DiffExtensionV2.js

# Update acceptChange and rejectChange commands
# to use getAdjustedPosition() and updatePositionsAfter()
```

## Step 5: Manual Testing (10 minutes)
```bash
# Create the manual test
touch public/test-position-fix.js

# Copy test code from kickoff doc
# Run in browser console
# Verify no RangeError!
```

## 🎯 Success Checklist
- [ ] Test written and failing
- [ ] ChangeManagerV2 has position tracking
- [ ] Commands use adjusted positions
- [ ] Test now passing
- [ ] Manual test shows no RangeError
- [ ] Multiple changes can be accepted/rejected

## 💡 Pro Tips

1. **Start with the test** - It defines what success looks like
2. **Focus on calculatePositionDelta()** - This is the core logic
3. **Process changes right-to-left** - Avoids position conflicts
4. **Log positions** - Add console.logs to debug position math

## 🏁 Estimated Time: 1-2 hours

Once this works, batch operations and keyboard nav are trivial to add!

Go fix that bug! 💪 