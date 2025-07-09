# AI Diff System - Implementation Kickoff

## 🚀 Project Overview

We're implementing an AI-powered diff system for the SE Automation Tool that allows users to:
1. Select text in the document editor
2. Request AI-powered edits with natural language instructions
3. See proposed changes as visual diffs (like Cursor IDE)
4. Accept or reject changes individually or in batches

## 🏗️ Architecture Summary

**Key Decision**: We're using a **Vercel → Supabase split architecture**:
- Frontend sends AI requests to Vercel Functions (non-blocking)
- Vercel processes with LangGraph and stores results in Supabase
- Frontend receives real-time updates via Supabase subscriptions
- This provides progressive loading and better error handling

## 📋 Your Mission: Phase 1 - Frontend Foundation (Week 1)

### Context
- You're part of the **Frontend Team** responsible for the UI/UX layer
- The Backend Team will handle Vercel API implementation and LangGraph integration
- All planning documents are in the repo (AI_DIFF_*.md files)
- The existing app uses React, TipTap editor, and Supabase

### First Tasks - Text Selection & Context System

**Task 1: Create Selection Handler (Day 1-2)**
```
Create: src/extensions/DiffExtension/SelectionHandler.js
- Extract text with precise boundaries from TipTap editor
- Build "quarantine zones" (isolated text sections for AI to edit)
- Handle multi-node selections (across paragraphs)
- Support different modes: word, sentence, paragraph, section
```

**Task 2: Create Context Builder (Day 2-3)**
```
Create: src/services/contextBuilder.js
- Extract text before/after selection for AI context
- Format data for API requests
- Handle edge cases (start/end of document)
```

**Task 3: Create TipTap Extension Scaffold (Day 3-4)**
```
Create: src/extensions/DiffExtension/index.js
- Basic TipTap extension structure
- Plugin configuration for diff functionality
- State management setup
- Integration with existing editor
```

### Implementation Guidelines

1. **Start Simple**
   - Focus on paragraph-level selections first
   - Use mock data for testing
   - Don't worry about the AI part yet

2. **Key Technical Details**
   - Use TipTap's `Selection` and `ResolvedPos` APIs
   - ProseMirror positions are crucial - they change after edits
   - Test position stability after document changes

3. **Code Example to Get Started**
   ```javascript
   // SelectionHandler.js starter
   export class SelectionHandler {
     constructor(editor) {
       this.editor = editor;
     }

     getQuarantineZone(mode = 'paragraph') {
       const { selection } = this.editor.state;
       const { $from, $to } = selection;
       
       // Your implementation here
       // See AI_DIFF_FRONTEND_ARCHITECTURE.md for full example
     }
   }
   ```

4. **Testing Approach**
   - Create a test document with various content types
   - Test selection across different node types
   - Verify boundaries are correct
   - Test with document mutations

### Resources

1. **Documentation**
   - `AI_DIFF_FRONTEND_ARCHITECTURE.md` - Your main technical guide
   - `AI_DIFF_IMPLEMENTATION_PLAN.md` - Full roadmap
   - `AI_DIFF_PRODUCT_SPEC.md` - UX requirements

2. **Key Dependencies**
   - TipTap documentation: https://tiptap.dev/api/introduction
   - ProseMirror guide: https://prosemirror.net/docs/guide/
   - Existing codebase: `src/pages/DocumentEditorPage.jsx`

3. **API Contracts**
   - Review API contracts in `AI_DIFF_FRONTEND_ARCHITECTURE.md`
   - We'll integrate with real APIs in Phase 3

### Definition of Done for Week 1

- [ ] SelectionHandler can extract text with boundaries
- [ ] Context builder formats requests correctly
- [ ] TipTap extension loads without errors
- [ ] Basic tests for selection extraction
- [ ] Position mapping handles document edits
- [ ] Code follows existing project patterns

### Next Steps

After completing Phase 1, we'll move to:
- **Phase 2**: Diff visualization (visual changes, accept/reject UI)
- **Phase 3**: API integration (connect to Vercel/Supabase)
- **Phase 4**: Polish and testing

### Questions to Consider

1. How should we handle selections that span multiple node types?
2. What's the minimum context needed for accurate AI edits?
3. How do we ensure position stability after document changes?

### Getting Started Commands

```bash
# Install any needed dependencies
npm install diff-match-patch

# Create the extension directory
mkdir -p src/extensions/DiffExtension

# Start the dev server
npm run dev

# Open the editor at: http://localhost:5173
```

### Communication

- Review the existing AI chat implementation in `src/components/AIChat/`
- Look at how documents are currently edited in `src/pages/DocumentEditorPage.jsx`
- The change management pattern should be similar to the existing document save flow

---

### What Success Looks Like

When complete, users will be able to:

```
1. Select text: "The product offers great value"
2. Type instruction: "Make this more compelling"
3. See diff:
   The product offers [-great value-] [+exceptional value with 
   industry-leading features and unmatched ROI+]
4. Click ✓ to accept or ✗ to reject
```

### Quick Reference - File Structure

```
src/
├── extensions/
│   └── DiffExtension/
│       ├── index.js          // Main extension
│       ├── SelectionHandler.js
│       ├── DiffDecorations.js
│       └── ChangeWidgets.js
├── services/
│   ├── ChangeManager.js
│   ├── SubscriptionManager.js
│   ├── contextBuilder.js
│   └── api/
│       └── diffApi.js
├── components/
│   ├── AIInstructionModal.jsx
│   ├── DiffControlPanel.jsx
│   └── ChangeSummaryPanel.jsx
└── hooks/
    └── useAIDiff.js
```

**Remember**: Start simple, test thoroughly, and iterate. The goal for Week 1 is a solid foundation for text selection and context extraction. Don't try to build the entire system at once!

Good luck! 🎯
