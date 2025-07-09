# Document Deletion Feature - Test Checklist

## Prerequisites
- [ ] Development server running on http://localhost:5177/
- [ ] Logged into the application
- [ ] At least one account with documents exists

## Test Cases

### 1. Document Deletion

#### Test 1.1: Delete Button Visibility
- [ ] Navigate to an account detail page with documents
- [ ] Verify delete buttons are hidden by default
- [ ] Hover over a document card
- [ ] Verify delete button appears with smooth opacity transition
- [ ] Verify delete button has red styling

#### Test 1.2: Delete Confirmation
- [ ] Click the delete button on a document
- [ ] Verify confirmation dialog appears with appropriate warning
- [ ] Click "Cancel" and verify nothing happens
- [ ] Click the delete button again
- [ ] Click "Delete" to confirm

#### Test 1.3: Successful Deletion
- [ ] After confirming deletion, verify:
  - [ ] Document is removed from the list
  - [ ] Success notification appears in top-right corner
  - [ ] Success notification auto-dismisses after 3 seconds
  - [ ] Document list updates without page refresh

#### Test 1.4: Navigation Prevention
- [ ] Hover over a document and click the delete button
- [ ] Verify clicking delete button doesn't navigate to document editor

### 2. Reference Document Deletion

#### Test 2.1: Delete Button Always Visible
- [ ] Navigate to Context Files section
- [ ] Verify delete buttons are always visible (not hover-based)
- [ ] Verify buttons have red styling

#### Test 2.2: Reference-Specific Confirmation
- [ ] Click delete on a reference file
- [ ] Verify confirmation message explains:
  - [ ] This removes the reference only
  - [ ] Documents created from it won't be affected

#### Test 2.3: Successful Removal
- [ ] Confirm deletion and verify:
  - [ ] Reference file is removed from list
  - [ ] Success notification says "Reference file removed successfully"
  - [ ] List updates without page refresh

### 3. Error Handling

#### Test 3.1: Network Error
- [ ] Disable network/stop backend
- [ ] Try to delete a document
- [ ] Verify error alert appears with message

#### Test 3.2: Permission Error
- [ ] If possible, try to delete another user's document
- [ ] Verify appropriate error message

### 4. UI/UX Polish

#### Test 4.1: Visual Consistency
- [ ] Verify all delete buttons use consistent icons
- [ ] Verify hover states work smoothly
- [ ] Verify success notifications match app styling

#### Test 4.2: Multiple Deletions
- [ ] Delete multiple documents in succession
- [ ] Verify each deletion works independently
- [ ] Verify UI remains responsive

## Edge Cases

- [ ] Try deleting the last document in the list
- [ ] Try deleting while file upload is in progress
- [ ] Verify empty state appears when all documents deleted

## Regression Tests

- [ ] Creating new documents still works
- [ ] Uploading files still works
- [ ] Document navigation still works
- [ ] File processing still works

## Notes
- Browser console should be monitored for any errors
- Network tab can verify correct API calls
- Test on different screen sizes for responsive behavior 