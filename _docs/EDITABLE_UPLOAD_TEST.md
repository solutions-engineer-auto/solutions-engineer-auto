# Editable Document Upload Feature - Test Plan

## Feature Overview
Added the ability to upload files directly as editable documents in the Documents section. This is separate from the Context Files upload which creates reference (non-editable) files.

## Test Cases

### 1. Basic Upload Flow
1. Navigate to any account detail page
2. Scroll to the "Documents" section
3. Find the "Upload Document for Editing" subsection
4. Drag and drop a supported file (PDF, DOCX, TXT, etc.)
5. Enter a title when prompted
6. Verify progress indicators show
7. Verify automatic navigation to document editor

### 2. File Type Support
Test each file type:
- [x] PDF files
- [x] DOCX files
- [x] DOC files
- [x] TXT files
- [x] Markdown (.md) files
- [x] RTF files

### 3. Error Handling
- [ ] Cancel title prompt - should abort upload
- [ ] Empty file - should show error
- [ ] File too large (>50MB) - should show error
- [ ] Unsupported file type - should show error
- [ ] Network error during save - should show error

### 4. UI/UX Validation
- [ ] Progress indicator shows correct messages
- [ ] Progress bar animates smoothly
- [ ] Clear distinction between reference and editable uploads
- [ ] Document appears in documents list after upload
- [ ] Proper loading states during processing

### 5. Integration Points
- [ ] Document saves to `documents` table (not `account_data_sources`)
- [ ] Document has correct metadata (title, account_id, author_id)
- [ ] Document content is properly converted HTML
- [ ] Document opens in editor with full content
- [ ] Document can be edited and saved

## Test Data
Use these sample files for testing:
1. Simple text document
2. Complex Word document with formatting
3. PDF with multiple pages
4. Markdown file with code blocks

## Expected Behavior
1. **Upload Location**: Files uploaded in Documents section create editable documents
2. **Processing**: Uses same HTML conversion as reference files
3. **Database**: Saves to `documents` table with status 'draft'
4. **Navigation**: Auto-navigates to editor after successful upload
5. **Title**: User must provide title (defaults to filename without extension)

## Cleanup Instructions
After testing is complete and verified:
1. Delete this test file
2. Remove any test documents created during testing
3. Clear browser cache if needed 