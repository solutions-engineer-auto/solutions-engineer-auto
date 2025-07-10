# Memory Bank - SE Auto MVP Frontend

## Project Overview
This is a Next.js frontend application for sales automation with document editing capabilities using TipTap editor and Supabase for backend services.

## Key Technical Decisions

### 1. Document Editor (TipTap)
- Using TipTap v2.25.0 with StarterKit, TextStyle, TextAlign, Link extensions
- Documents stored in Supabase with HTML content
- Auto-save functionality with debounced updates
- Export capabilities: PDF, DOCX, Markdown, HTML, Plain Text

### 2. AI Diff System (Phase 2 Complete ✅)
- **Architecture**: Uses TipTap marks (not decorations) for automatic position tracking
- **Visual System**: 
  - Green highlights for additions
  - Red with strikethrough for deletions
  - Cyan/blue for modifications
- **UI Flow**:
  - Click any highlighted text to see detailed changes
  - Beautiful glassmorphic overlay shows original vs suggested text
  - Confirm/Decline buttons to accept or reject changes
- **Implementation Details**:
  - DiffExtensionV2 using mark-based system
  - ChangeManagerV2 for tracking changes
  - React Portals for overlay positioning
  - Proper ProseMirror position handling with doc.descendants()

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

## Phase Status
- ✅ Phase 1: Frontend Foundation (SelectionHandler, ContextBuilder, DiffExtension)
- ✅ Phase 2: Core Diff UI (Visual marks, overlay system, accept/reject)
- ⏳ Phase 3: API Integration (Ready for LLM connection)
- ⏳ Phase 4: Polish & Optimization

## Quick Test Commands
```javascript
// Test the complete diff UI
const script = document.createElement('script');
script.src = '/test-llm-ui-flow.js';
document.body.appendChild(script);

// After running, use helpers:
acceptAllSuggestions()  // Accept all changes
showFinalText()         // Show document text
```

## Recent Achievements
- Fixed mark attribute bug (data-diff-type vs type)
- Implemented full click → overlay → confirm/decline flow
- Created beautiful UI matching app theme
- Ready for LLM integration with simple API

---
Last Updated: Phase 2 Complete with Full UI Integration 🎉
