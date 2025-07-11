# Memory Bank - SE Auto MVP Frontend

## Project Overview
This is a Next.js frontend application for sales automation with document editing capabilities using TipTap editor and Supabase for backend services.

## Key Technical Decisions

### 1. Document Editor (TipTap)
- Using TipTap v2.25.0 with StarterKit, TextStyle, TextAlign, Link extensions
- Documents stored in Supabase with HTML content
- Auto-save functionality with debounced updates
- Export capabilities: PDF, DOCX, Markdown, HTML, Plain Text

### 2. AI Diff System (COMPLETE & WORKING ✅)
- **Current Status**: Fully functional with "Test Diff" button in toolbar
- **How it Works**:
  1. Select text in editor
  2. Click "🧪 Test Diff" button
  3. Creates diff mark showing "TEST" as replacement
  4. Click the cyan highlight to see overlay
  5. Click Confirm to accept or Decline to reject
- **Architecture**: Uses TipTap marks (not decorations) for automatic position tracking
- **Visual System**: 
  - Green highlights for additions
  - Red with strikethrough for deletions
  - Cyan/blue for modifications
- **Implementation Details**:
  - DiffExtensionV2 using mark-based system
  - ChangeManagerV2 for tracking changes
  - React Portals for overlay positioning
  - Working test button at line 762 in DocumentEditorPage.jsx
  - Just needs AI integration to replace "TEST" with real suggestions

### 3. File Upload & Processing
- Two types of uploads:
  1. Reference files (PDFs, emails) → account_data_sources table
  2. Editable documents → documents table
- Uses Mammoth for DOCX→HTML, pdf-parse for PDF text extraction
- FileUploadDropzone component with drag-and-drop support

### 4. Authentication & Routing
- Supabase Auth with email/password
- Protected routes using RequireAuth component
- Public routes: /login only
- Dashboard at /accounts, document editor at /documents/:id

### 5. State Management
- React Context for global state (AuthContext)
- Local state with hooks for component-specific data
- TipTap editor state managed internally by the library

### 6. Styling
- Tailwind CSS with custom volcanic beach theme
- Glassmorphic design elements
- Dark theme with orange accents (#FF6B35)
- Custom styles for editor, overlays, and modals

## Common Pitfalls & Solutions

### ProseMirror Position Calculation
- Always use doc.descendants() to find positions, never string indexes
- Account for node boundaries (position 0 = before doc, position 1 = inside paragraph)
- Test with actual document structure, not assumptions

### TipTap Extension Development
- Use marks for persistent highlights (they move with text)
- Never store editor references during onCreate()
- Always get editor from command context
- Use onMouseDown instead of onClick for buttons

### React 18 Compatibility
- Use createRoot() instead of ReactDOM.render()
- Proper cleanup in useEffect hooks
- Handle SSR considerations for document/window access

## Testing Approach
- Manual test scripts in public/ directory
- Use browser console for quick testing
- Always verify with actual document content
- Test edge cases: empty documents, overlapping changes

## Implementation Status
- ✅ Diff Visualization System: 100% Complete
- ✅ Test Diff Button: Working (creates "TEST" replacement)
- ✅ Accept/Reject UI: Fully functional
- ⏳ AI Integration: Next step (replace "TEST" with AI suggestions)

## Quick Test Commands
```javascript
// Test the working diff system right now:
editor.commands.addChange({
  type: 'modification',
  originalText: 'hello',
  suggestedText: 'greetings',
  position: { from: 0, to: 5 }
});

// Or use the Test Diff button in the toolbar!
```

## What's Next
- Create mockAIService.js to return AI suggestions
- Update Test Diff button to use AI service
- That's it! The diff system already handles everything else

---
Last Updated: Diff System Complete - Just Add AI! 🎉
