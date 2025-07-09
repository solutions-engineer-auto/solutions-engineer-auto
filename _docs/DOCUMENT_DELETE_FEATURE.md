# Document Deletion Feature

## Overview

The SE Automation Tool now includes proper deletion functionality for both:
1. **Documents** - Editable documents in the `documents` table
2. **Reference Documents** - Context files in the `account_data_sources` table

## Features Implemented

### 1. Document Deletion

- **Location**: Documents section in the account detail page
- **UI**: Delete button appears on hover for each document
- **Confirmation**: Confirms deletion with a warning that the action cannot be undone
- **Visual Feedback**: Success notification appears after successful deletion
- **Safety**: Event propagation is stopped to prevent accidental navigation

### 2. Reference Document Deletion

- **Location**: Context Files section
- **UI**: Red delete button for each reference file
- **Confirmation**: Explains that removal only affects the reference, not any documents created from it
- **Visual Feedback**: Success notification after removal
- **Purpose**: Helps manage context files without affecting derived documents

### 3. Enhanced User Experience

#### Delete Functions
```javascript
// Document deletion with proper UI feedback
const deleteDocument = async (docId, e) => {
  e.stopPropagation() // Prevent navigation
  // Confirmation dialog
  // Database deletion
  // Success notification
}

// Reference document deletion
const deleteReferenceDocument = async (docId, e) => {
  // Similar pattern with context-specific messaging
}
```

#### Visual Enhancements
- Delete buttons use hover effects and red coloring for clarity
- Opacity transitions make buttons appear smoothly on hover
- Success notifications appear temporarily with checkmark icons
- Glass-morphic styling matches the app's design language

### 4. Reusable Confirmation Modal

Created `ConfirmationModal.jsx` component for future use:
- Supports different types: danger, warning, info
- Animated entrance/exit
- Portal rendering to document body
- Customizable messages and button text
- Backdrop blur effect

## Security & Database

The implementation leverages existing database policies:
- Users can only delete their own documents
- Proper error handling for failed deletions
- Clear error messages for user feedback

## How to Use

### For Documents:
1. Navigate to an account's detail page
2. Hover over any document in the Documents section
3. Click the red trash icon that appears
4. Confirm the deletion in the dialog

### For Reference Files:
1. Scroll to the Context Files section
2. Find the reference file to remove
3. Click the trash icon (always visible)
4. Confirm removal in the dialog

## Benefits

- **Data Management**: Users can now properly manage their documents and references
- **Safety**: Confirmation dialogs prevent accidental deletions
- **Clarity**: Different messaging for documents vs references helps users understand the impact
- **Polish**: Smooth animations and visual feedback create a professional experience

## Future Enhancements

The `ConfirmationModal` component can replace the browser's `window.confirm` dialogs throughout the app for a more consistent, polished experience. 