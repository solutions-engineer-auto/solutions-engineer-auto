# Account Deletion Test Checklist

This checklist covers testing the secure account deletion feature with confirmation modal.

## Delete Button Location
- [ ] Navigate to any account detail page
- [ ] Verify "Delete Account" button appears next to "Edit Details" button
- [ ] Check button has red hover effect
- [ ] Button should only appear in view mode (not when editing)

## Modal Appearance
- [ ] Click "Delete Account" button
- [ ] Verify modal appears with:
  - Title "Delete Account"
  - Warning message with red background
  - List of what will be deleted
  - Input field for account name confirmation
  - Cancel and Delete Account buttons

## Confirmation Input
- [ ] Account name shown in cyan color
- [ ] Try typing wrong name - verify:
  - Error message appears
  - Input border turns red
  - Delete button remains disabled
- [ ] Type correct name - verify:
  - Error message disappears (if shown)
  - Input border turns green
  - Delete button becomes enabled

## Modal Controls
- [ ] Click outside modal - should close (unless deleting)
- [ ] Press Escape - should close (unless deleting)
- [ ] Click X button - should close
- [ ] Click Cancel - should close

## Deletion Process
- [ ] Type correct account name
- [ ] Click "Delete Account"
- [ ] Verify during deletion:
  - Button shows spinner
  - Text changes to "Deleting..."
  - Modal cannot be closed
  - All buttons are disabled

## Data Deletion Verification
- [ ] After successful deletion:
  - Success notification appears
  - User is redirected to accounts dashboard
  - Account no longer appears in list
- [ ] Verify in database (Supabase dashboard):
  - Account record deleted from accounts table
  - All documents deleted from documents table
  - All data sources deleted from account_data_sources table

## Error Handling
- [ ] Test with network disconnected
- [ ] Verify descriptive error message appears
- [ ] Modal should remain open after error
- [ ] Form should be re-enabled after error

## Edge Cases
- [ ] Try deleting account with many documents
- [ ] Try deleting account with many reference files
- [ ] Test account names with special characters
- [ ] Test very long account names

## Security
- [ ] Cannot delete without typing exact name (case-sensitive)
- [ ] Cannot bypass confirmation by manipulating DOM
- [ ] RLS policies prevent deleting other users' accounts

## Visual Design
- [ ] Glassmorphic styling consistent with other modals
- [ ] Warning section clearly visible with red accent
- [ ] Smooth animations on open/close
- [ ] Proper spacing and typography

## Cascading Deletion Order
Verify deletion happens in correct order:
1. Documents first
2. Data sources second  
3. Account last

This prevents orphaned records if deletion fails partway through. 