# Solution Engineer Automation Tool - Frontend Memory Bank

## 🚨 Critical Implementation Gotchas

### Quick Reference for Common Issues:
1. **TipTap buttons not working?** → Use `onMouseDown` NOT `onClick` [[memory:2533006]]
2. **React state error with document/window?** → Never name state vars after globals [[memory:2529030]]
3. **Tailwind CSS not loading?** → Check if using v4 - syntax is different! [[memory:2534718]]
4. **TipTap duplicate extension error?** → Disable in StarterKit config [[memory:2528434]]
5. **Lists bullets offset?** → Use `list-style-position: outside` with proper padding
6. **DOCX export failing?** → Don't use `html-docx-js` - use modern `docx` library [[memory:2538911]]
7. **PDF export missing headings?** → Strip dark theme color classes & force black text [[memory:2539981]]
8. **PDF list numbers offset?** → Remove Tailwind margin classes & set explicit styles [[memory:2541362]]

## Project Setup ✅

### Milestone 1: Project Initialization (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Dependencies Installed**:
  - TailwindCSS (with PostCSS and Autoprefixer)
  - MSW (Mock Service Worker) - Service worker initialized in `/public`
  - TipTap (with starter kit and basic extensions)
  - React Router DOM
  - Zustand (state management)
- **Folder Structure Created**:
  ```
  /src
    /components
    /pages
    /mocks
    /styles
    /utils
  ```
- **Configuration Files**:
  - `tailwind.config.js` - Standard React setup
  - `postcss.config.js` - For TailwindCSS processing
  - Updated `src/index.css` with Tailwind directives

### Milestone 2: Auth Flow - Mocked (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Components Created**:
  - `LoginPage` - Clean login UI with demo engineer button
  - `RequireAuth` - Route guard component for protected routes
  - `AccountDashboard` - Placeholder with logout functionality
- **Features Implemented**:
  - Login stores `userId` in localStorage
  - Protected routes redirect to login if not authenticated
  - Logout clears localStorage and redirects to login
  - React Router setup with proper routing structure
- **Routes Configured**:
  - `/login` - Public login page
  - `/accounts` - Protected account dashboard
  - `/` - Redirects to `/accounts`

### Milestone 3: Account Dashboard (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Components Created**:
  - `AccountCard` - Displays individual account with status badges
  - MSW handlers for API mocking
  - Browser setup for MSW service worker
- **Features Implemented**:
  - Fetches accounts from mocked GET /accounts API
  - Displays accounts in responsive grid layout
  - Filter by sales stage functionality
  - Color-coded badges for stages and document status
  - Click navigation to account detail (route ready)
- **Mock Data**:
  - 5 sample accounts with different stages
  - Document statuses: draft, finalized, or none
  - Account details include name, value, contact, stage

### Milestone 4: Prospect Detail View (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Components Created**:
  - `ProspectDetailPage` - Shows detailed account information
- **Features Implemented**:
  - Fetches account details from GET /accounts/:id
  - Displays account summary with name, stage, value, contact
  - Shows existing documents with status badges
  - "Generate Suggested Document" button with loading state
  - Calls POST /documents/generate API
  - Back navigation to accounts list
  - Placeholder for file upload (Milestone 5)
- **UI Elements**:
  - Clean card-based layout
  - Color-coded stage and status badges
  - Loading and error states
  - Empty state for no documents

### UI Transformation: Volcanic Beach Theme (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Design System**:
  - **Theme**: Dark-mode glassmorphic inspired by volcanic beaches
  - **Background**: Deep navy (#0A0F1E) to near-black (#05070C) gradient
  - **Panels**: Frosted glass with 25% opacity, 12-18px blur, white borders at 15% opacity
  - **Colors**: 
    - Ash-gray/black for base layers
    - Foamy blue/white for overlays
    - Lava orange/red (#FF4500, #CF1020) for CTAs and active states
  - **Typography**: Light weight sans-serif, elegant and minimal
  - **Effects**: Soft glows, lava-inspired hover states, smooth transitions
- **Components Updated**:
  - Custom Tailwind config with volcanic color palette
  - Glassmorphic utility classes in index.css
  - All pages and components transformed
  - Button styles with lava glow effects
  - Badge gradients for visual hierarchy
  - Animated background elements
- **Key Features**:
  - `.glass-panel` utility for consistent glassmorphism
  - `.btn-volcanic` and `.btn-volcanic-primary` for buttons
  - Gradient text effects with `.text-gradient-lava`
  - Custom scrollbar styling
  - Responsive and accessible design

### Critical Bug Resolution: Tailwind v4 Compatibility Issues
- **Date**: July 7, 2025
- **Issue**: After implementing the volcanic theme, CSS completely stopped loading
- **Root Cause**: Project was using Tailwind CSS v4.1.11, which has fundamentally different syntax than v3
- **Symptoms**:
  1. PostCSS plugin errors requiring @tailwindcss/postcss installation
  2. Custom colors in tailwind.config.js not being recognized
  3. Empty CSS file being served by Vite
  4. Console errors about invalid @tailwind directives
- **Key Differences in Tailwind v4**:
  - Uses `@import "tailwindcss"` instead of `@tailwind base/components/utilities`
  - Different PostCSS configuration requirements
  - Custom color handling has changed
- **Resolution Steps**:
  1. **Updated src/index.css** - Changed from v3 syntax to v4:
     ```css
     /* OLD (v3) - DOESN'T WORK IN v4 */
     @tailwind base;
     @tailwind components;
     @tailwind utilities;
     
     /* NEW (v4) - CORRECT SYNTAX */
     @import "tailwindcss";
     ```
  2. **Replaced all custom color references** - Instead of using custom volcanic colors from config, used hex values directly:
     - `bg-volcanic-deep` → `bg-[#0A0F1E]`
     - `bg-volcanic-black` → `bg-[#05070C]`
     - `bg-volcanic-lava` → `bg-[#FF4500]`
     - `bg-volcanic-magma` → `bg-[#CF1020]`
  3. **Fixed custom shadow classes**:
     - `shadow-glow` → `shadow-lg shadow-blue-500/10`
  4. **Installed missing dependency**:
     - `npm install @tailwindcss/postcss`
- **Lessons Learned**:
  - Always check Tailwind version before applying v3 patterns
  - Tailwind v4 requires different import syntax
  - Custom colors may need to be handled differently in v4
  - When CSS doesn't load at all, check the browser console for specific errors

## Tech Stack Reference
- **Frontend**: React + Vite
- **Styling**: TailwindCSS
- **Editor**: TipTap
- **Routing**: React Router
- **State**: Zustand
- **API Mocking**: MSW

## API Endpoints Mocked
- `GET /api/accounts` - Returns list of all accounts
- `GET /api/accounts/:id` - Returns single account details
- `POST /api/accounts/:id/upload` - File upload endpoint
- `POST /api/documents/generate` - Document generation endpoint

### Milestone 7: TipTap Editor Integration (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Components Created**:
  - `DocumentEditorPage` - Full document editor with TipTap integration
- **Features Implemented**:
  - Rich text editor with formatting toolbar:
    - Bold, Italic, Underline
    - Headings (H1, H2, H3)
    - Bullet and Ordered Lists
    - Blockquote and Code blocks
    - Links and Highlight
  - Document state management (draft, ready_for_review, finalized)
  - Auto-save indicator and manual save
  - Keyboard shortcuts:
    - Cmd/Ctrl+K for AI regeneration (with text selection)
    - Cmd/Ctrl+S for save
  - Finalize document workflow with confirmation
  - Export modal (PDF/DOCX)
  - Read-only mode for finalized documents
  - AI regeneration modal (UI only, functionality mocked)
- **API Endpoints Added**:
  - `GET /api/documents/:id` - Fetches document with HTML content
  - `PUT /api/documents/:id` - Saves document changes
  - `POST /api/documents/:id/export` - Exports document
- **Routing**:
  - Added `/accounts/:accountId/documents/:docId` route
  - Updated ProspectDetailPage to navigate to editor after generation
- **Custom Styles Added**:
  - TipTap editor focus outline removal
  - Placeholder text styling for empty editor
  - Dark mode prose overrides for volcanic theme:
    - Custom text colors for headings, body, links
    - Orange accent for links and quote borders
    - Yellow code highlighting
    - Semi-transparent backgrounds for code blocks
  - All styles integrated with the volcanic beach theme

### Document Editor Bug Fixes (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Issues Fixed**:
  - Fixed "Duplicate extension names" error by disabling codeBlock in StarterKit config
  - Fixed null reference errors with proper editor state checks
  - Fixed useEffect dependencies and added useCallback for handleSave
  - Made document cards clickable to navigate to editor
  - Added "Generate New Document" button even when documents exist
- **UI Placeholder Features** (Ready for Backend Integration):
  - AI Text Regeneration modal (Cmd/Ctrl+K) - Shows UI with placeholder message
  - Export functionality - Shows mock download URL
  - All buttons connected and ready for plug-and-play integration

### Document Editor Enhancements (COMPLETED)
- **Date**: July 7, 2025
- **Status**: ✅ Complete
- **Improvements Made**:
  - Fixed toolbar buttons requiring multiple clicks [[memory:2533006]]
  - Fixed headings (H1, H2, H3) not working properly
  - Fixed lists (bullet and numbered) not formatting correctly
  - Added text alignment features (left, center, right, justify)
  - Added "Normal Text" button to convert headings back to paragraphs
  - Improved button handling with onMouseDown instead of onClick
  - Added proper CSS styles for all text elements in the editor
  - Configured StarterKit with proper HTMLAttributes
- **New Features**:
  - Text alignment buttons with visual indicators
  - Better visual feedback for active formatting states
  - Improved list styling with proper indentation
  - Enhanced blockquote and code block styling

### Critical Implementation Learnings

#### TipTap Editor Best Practices [[memory:2533006]]
- **Toolbar Button Implementation**:
  - MUST use `onMouseDown` instead of `onClick` to prevent focus issues
  - Always use `editor.chain().focus().command().run()` syntax
  - Handle preventDefault and stopPropagation in button handlers
- **Extension Configuration**:
  - Disable duplicate extensions in StarterKit to avoid errors
  - Configure HTMLAttributes for proper element styling
  - Include TextAlign and TextStyle extensions for formatting
- **CSS Styling**:
  - Use `list-style-position: outside` for lists, NOT `list-inside`
  - Apply proper padding-left and margin-left for list indentation
  - Style paragraph elements inside list items separately

#### React State Variable Naming [[memory:2529030]]
- **Critical**: Never name state variables with global object names
- **Examples of BAD names**: `document`, `window`, `location`, `history`, `navigator`
- **Why**: These shadow global objects and cause confusing errors
- **Example Error**: `document.addEventListener` fails because `document` refers to null state
- **Solution**: Use descriptive names like `documentData`, `windowSize`, `locationInfo`

#### Text Alignment Selection Issues
- **Problem**: Alignment can grab text from adjacent paragraphs
- **Root Cause**: Selection may span multiple paragraph nodes
- **Solution**: Collapse selection to cursor position before applying alignment:
  ```javascript
  const { selection } = editor.state
  const pos = selection.$anchor.pos
  editor.chain().focus().setTextSelection(pos).setTextAlign('left').run()
  ```
- **Visual Aid**: Added hover borders to show paragraph boundaries

#### TipTap + StarterKit Integration [[memory:2528434]]
- **Common Errors**:
  - "Duplicate extension names" when adding custom extensions
  - "Cannot access before initialization" with hooks
- **Solutions**:
  - Disable conflicting extensions in StarterKit config
  - Define callbacks before useEffect dependencies
  - Proper null checks for editor state properties

#### Tailwind CSS v4 Migration Issues [[memory:2534718]]
- **Critical Differences from v3**:
  - MUST use `@import "tailwindcss"` NOT `@tailwind` directives
  - May require separate @tailwindcss/postcss installation
  - Custom colors may fail - use bracket notation `bg-[#hexvalue]`
- **Debugging Empty CSS**:
  - Check browser console for PostCSS errors
  - Verify Tailwind version with `npm list tailwindcss`
  - Empty CSS file from Vite = version mismatch issue

### AI Chat Panel Integration (COMPLETED)
- **Date**: December 2024
- **Status**: ✅ Complete
- **Features Implemented**:
  - Cursor-like AI chat side panel with resizable interface
  - Simulated AI streaming responses with word-by-word animation
  - Activity indicators showing AI states (thinking, reading, searching, etc.)
  - Full markdown support with syntax highlighting for code blocks
  - Glassmorphic design consistent with volcanic beach theme
  - Keyboard shortcut (Cmd/Ctrl+Shift+L) to toggle panel
  - Auto-includes document content for contextual responses
  - Starter prompts for common actions
  - Minimize/expand functionality
  - Clear chat history option
- **Technical Details**:
  - Custom hook `useAIChat` manages chat state and streaming
  - Modular component architecture (AIChatPanel, AIMessage, AIActivityIndicator, AIChatInput)
  - Mock responses demonstrate various formatting capabilities
  - Ready for SSE (Server-Sent Events) integration with real backend
  - Responsive layout adjusts editor width when panel is open
- **Dependencies Added**:
  - `react-markdown` for markdown rendering
  - `react-syntax-highlighter` for code syntax highlighting
- **Files Created**:
  - `src/components/AIChat/AIChatPanel.jsx` - Main chat container with resize/minimize
  - `src/components/AIChat/AIMessage.jsx` - Message rendering with markdown support
  - `src/components/AIChat/AIActivityIndicator.jsx` - AI activity state indicators
  - `src/components/AIChat/AIChatInput.jsx` - Chat input with auto-resize
  - `src/components/AIChat/useAIChat.js` - Hook managing chat state and streaming
- **Integration Points**:
  - Toggle button added to document editor header
  - Keyboard shortcut handler in document editor
  - CSS animations and responsive layout adjustments

### Document Export Functionality (COMPLETED)
- **Date**: December 2024
- **Status**: ✅ Complete
- **Features Implemented**:
  - Multi-format export support (PDF, DOCX, Markdown, HTML, Plain Text)
  - Enhanced export modal with format selection UI
  - Format-specific options:
    - PDF/DOCX: Page size, orientation, margins, font size
    - All formats: Document metadata (title, author, dates)
  - Preview functionality for all formats except DOCX
  - File size estimation before export
  - Client-side processing for privacy and speed
  - Progress indicators during export
  - Comprehensive error handling and validation
- **Technical Architecture**:
  - Modular service architecture in `src/services/`
  - Format-specific exporters with shared interface
  - Main coordinator service handles format routing
  - Beautiful glassmorphic modal UI component
- **Libraries Used**:
  - `html2pdf.js` - PDF generation with styling
  - ~~`html-docx-js`~~ - **REPLACED with `docx`** due to ESM compatibility [[memory:2538911]]
  - `turndown` - HTML to Markdown conversion
  - `file-saver` - Cross-browser file downloads
- **Export Options**:
  - Customizable filename
  - Document metadata embedding
  - Page setup (size, orientation, margins)
  - Font settings
  - Format-specific optimizations
- **Critical Fix**: DOCX Export Library Issue [[memory:2538911]]
  - **Problem**: `html-docx-js` uses deprecated `with` statement incompatible with ESM
  - **Error**: "With statements cannot be used with the 'esm' output format due to strict mode"
  - **Solution**: Replaced with modern `docx` library which is ESM-compatible
  - **Implementation**: Custom DOCX exporter that converts HTML to docx format programmatically

### Document Status Management Enhancement (COMPLETED)
- **Date**: December 2024
- **Status**: ✅ Complete
- **Changes Made**:
  - **Export Always Available**: Removed restriction requiring documents to be finalized before export
  - **Status Dropdown**: Replaced "Finalize Document" button with dropdown selector
  - **Available Statuses**:
    - New (gray badge)
    - Draft (blue badge)
    - In Progress (purple badge)
    - Under Review (yellow badge)
    - Ready for Review (orange badge)
    - Finalized (green badge)
  - **Status Behavior**:
    - Finalized documents become read-only
    - Other statuses keep document editable
    - Confirmation required when changing to "finalized"
  - **UI Improvements**:
    - Glassmorphic dropdown matching theme
    - Status badge colors consistent throughout app
    - Dropdown disabled when document is finalized
- **Technical Details**:
  - `handleStatusChange` function replaces `handleFinalize`
  - Status dropdown uses native select with custom styling
  - Export button no longer has `disabled={!isFinalized}` condition

### PDF Export Headings Fix (COMPLETED)
- **Date**: December 2024  
- **Status**: ✅ Complete
- **Issue**: Headings and text not appearing in PDF exports [[memory:2539981]]
- **Root Cause**: TipTap editor configured with `text-white` classes for dark theme
- **Solution**:
  - Added HTML preprocessing to strip all theme color classes
  - Force black text color with `!important` in PDF CSS
  - Added catch-all rule `* { color: #000 !important; }`
  - Preserved link colors separately
- **Technical Implementation**:
  - Modified `prepareHTMLForPDF()` function to remove color classes
  - Updated PDF CSS with explicit black color rules
  - All text now visible on white PDF background
- **Additional Fixes**:
  - Fixed preview white-on-white text by adding same preprocessing to `generatePrintPreview()`
  - Fixed list number offset in PDFs by:
    - Adding `list-style-position: outside` CSS rule
    - Removing Tailwind margin classes (`ml-*`) during preprocessing
    - Setting explicit inline styles on list elements
    - Overriding TipTap's `.list-disc` and `.list-decimal` classes
  - Added explicit `list-style-type` for ordered and unordered lists

## Session Summary - December 2024

### Major Features Implemented:
1. **Cursor-like AI Chat Panel**:
   - Resizable side panel with glassmorphic UI
   - Streaming responses with activity indicators
   - Markdown support with syntax highlighting
   - Keyboard shortcut (Cmd/Ctrl+Shift+L)
   - Modular architecture with custom hook

2. **Comprehensive Document Export System**:
   - Multi-format support (PDF, DOCX, Markdown, HTML, Plain Text)
   - Beautiful export modal with format selection
   - Customizable options (page size, margins, metadata)
   - Preview functionality for all formats except DOCX
   - Client-side processing for privacy

3. **Document Status Management**:
   - Replaced finalize button with status dropdown
   - Six status options (new, draft, in progress, under review, ready for review, finalized)
   - Export available at any status (not just finalized)
   - Read-only mode for finalized documents

### Technical Challenges Solved:
- **DOCX Library Compatibility**: Replaced `html-docx-js` with modern `docx` library due to ESM issues
- **PDF White-on-White Text**: Fixed by stripping dark theme color classes
- **PDF List Number Offset**: Complex fix involving CSS overrides and Tailwind class removal
- **Tailwind v4 Compatibility**: Documented differences from v3

### Architecture Highlights:
- Modular service architecture for exports
- Clean separation of concerns
- Reusable components following project patterns
- Comprehensive error handling
- Memory bank documentation for future reference

### Document and Reference File Deletion (COMPLETED)
- **Date**: December 2024
- **Status**: ✅ Complete
- **Features Implemented**:
  - **Document Deletion** [[memory:2646433]]:
    - Delete button appears on hover for each document
    - Confirmation dialog prevents accidental deletions
    - Event propagation stopped to prevent navigation conflicts
    - Success notification with auto-dismiss after 3 seconds
    - Uses `deleteDocument()` function in ProspectDetailPage
  - **Reference File Deletion**:
    - Delete button always visible in Context Files section
    - Context-specific confirmation explaining only reference is removed
    - Documents created from the file remain untouched
    - Uses `deleteReferenceDocument()` function
    - Red-styled buttons for visual clarity
- **UI Enhancements**:
  - Hover effects with smooth opacity transitions
  - Glass-morphic success notifications
    - Appears in top-right corner
    - Green background with checkmark icon
    - Auto-dismisses after 3 seconds
  - Consistent red color scheme for delete actions
- **Technical Details**:
  - Both functions include `e.stopPropagation()` to prevent event bubbling
  - Proper error handling with user-friendly messages
  - Lists refresh automatically without page reload
  - Leverages existing database policies for security
- **Reusable Components**:
  - Created `ConfirmationModal.jsx` for future use:
    - Supports danger/warning/info types
    - Portal rendering to document body
    - Animated entrance/exit effects
    - Backdrop blur for focus
    - Can replace browser's `window.confirm` throughout app

### Enhanced Markdown Conversion (COMPLETED)
- **Date**: December 2024
- **Status**: ✅ Complete
- **Enhancement**: Upgraded markdown-to-HTML conversion in `documentProcessor.js`
- **Features Added**:
  - **Complete Markdown Support**:
    - All header levels (H1-H6)
    - Text formatting: bold, italic, strikethrough
    - Nested lists (ordered/unordered) with proper structure
    - Task lists with checkboxes
    - Tables with basic formatting
    - Blockquotes with paragraph wrapping
    - Horizontal rules (---, ***, ___)
    - Links with optional titles
    - Images with alt text and responsive sizing
    - Code blocks and inline code with proper escaping
  - **Security Improvements**:
    - HTML entity escaping to prevent XSS
    - Special handling for code blocks
    - Safe processing of user content
  - **Better Editor Integration**:
    - Wrapper div with consistent styling
    - Proper HTML structure for TipTap compatibility
    - Lists maintain proper nesting
    - Images are responsive by default
- **Technical Implementation**:
  - Enhanced `processMD()` method in documentProcessor
  - Extract and preserve code blocks during processing
  - Apply regex transformations for each markdown feature
  - Handle complex nested structures properly
  - Restore code blocks with proper escaping

## Next Steps
- Milestone 5: File Upload Interface
  - Create FileUploadDropzone component
  - Implement drag-and-drop functionality
  - Accept PDF, DOCX, TXT files only
  - Show file preview on drop
  - POST to /accounts/:id/upload
