# Account Creation Modal Test Checklist

This checklist covers testing the new account creation modal with all fields.

## Modal Functionality
- [ ] Click "New Account" button on dashboard
- [ ] Verify modal appears with glassmorphic styling
- [ ] Check all fields are present:
  - Account Name (required, marked with *)
  - Contact Person
  - Deal Value (default: $0)
  - Stage dropdown (default: Discovery)
  - Description textarea

## Form Interaction
- [ ] Try to submit with empty name - should not allow
- [ ] Fill in all fields and verify they update correctly
- [ ] Check stage dropdown shows all options:
  - Discovery
  - Pre-Sales
  - Pilot Deployment
  - Post-Sale
- [ ] Verify value field accepts any text input
- [ ] Check description textarea is resizable

## Modal Controls
- [ ] Click outside modal (backdrop) - should close
- [ ] Press Escape key - should close
- [ ] Click X button - should close
- [ ] Click Cancel button - should close without saving

## Account Creation
- [ ] Fill in required name field
- [ ] Leave other fields empty and submit
- [ ] Verify account is created with defaults:
  - Contact: "Not specified" if empty
  - Value: "$0" if left as default
  - Stage: "Discovery" if unchanged
  - Description: empty string if not filled
- [ ] Fill all fields with custom values and submit
- [ ] Verify new account appears in dashboard immediately
- [ ] Check account card displays all values correctly

## Loading State
- [ ] During submission, verify:
  - Button shows spinner
  - Button text changes to "Creating..."
  - Form is disabled
  - Modal cannot be closed

## Error Handling
- [ ] Test with network disconnected
- [ ] Verify error alert shows with descriptive message
- [ ] Modal should remain open after error
- [ ] Form data should be preserved after error

## Visual Design
- [ ] Glassmorphic panel with proper transparency
- [ ] Smooth fade-in animation
- [ ] Proper spacing between fields
- [ ] Value and Stage fields in 2-column grid
- [ ] Consistent styling with DocumentCreationModal

## Responsive Design
- [ ] Test on mobile viewport
- [ ] Modal should be scrollable if content exceeds viewport
- [ ] Form fields should stack properly on small screens 