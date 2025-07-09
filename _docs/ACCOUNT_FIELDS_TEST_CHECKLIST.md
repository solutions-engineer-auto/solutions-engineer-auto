# Account Fields Edit Feature Test Checklist

This checklist covers testing the new editable fields (contact, value, stage) for accounts.

## Database Setup
- [ ] Run the new migration: `20240718120006_add_contact_value_stage_to_accounts.sql`
- [ ] Verify the following columns are added to accounts table:
  - contact (VARCHAR)
  - value (VARCHAR, default: '$0')
  - stage (VARCHAR, default: 'Discovery')
  - description (TEXT)
  - last_updated (TIMESTAMPTZ)

## Account Dashboard View
- [ ] Navigate to `/accounts`
- [ ] Verify existing accounts display with default values:
  - Value shows as "$0" if empty
  - Contact shows as "No contact specified" if empty (italic, lighter text)
  - Stage shows as "Discovery" if empty
  - Last updated shows created_at if last_updated is null

## Account Detail Page - View Mode
- [ ] Click on an account to go to detail page
- [ ] Verify "Edit Details" button appears in top right of account summary
- [ ] Verify fields display with proper formatting:
  - Description shows "No description provided" if empty
  - Stage shows as colored badge
  - Value shows with gradient text
  - Contact shows normally or "Not specified" if empty

## Account Detail Page - Edit Mode
- [ ] Click "Edit Details" button
- [ ] Verify edit mode activates:
  - Description becomes a textarea
  - Stage becomes a dropdown with options: Discovery, Pre-Sales, Pilot Deployment, Post-Sale
  - Value becomes an input field
  - Contact becomes an input field
  - Save Changes and Cancel buttons appear

## Editing Functionality
- [ ] Edit all fields with new values
- [ ] Click "Save Changes"
- [ ] Verify:
  - Loading spinner shows during save
  - Success notification appears
  - Fields update to show new values
  - Edit mode exits automatically

## Cancel Functionality
- [ ] Enter edit mode
- [ ] Change some values
- [ ] Click "Cancel"
- [ ] Verify changes are discarded and original values remain

## New Account Creation
- [ ] Click "New Account" on dashboard
- [ ] Enter account name
- [ ] Verify new account is created with default values:
  - Contact: "Not specified"
  - Value: "$0"
  - Stage: "Discovery"

## Stage Badge Colors
- [ ] Verify stage badges show correct colors:
  - Discovery: Blue to cyan gradient
  - Pre-Sales: Purple to violet gradient
  - Pilot Deployment: Indigo to purple gradient
  - Post-Sale: Emerald to green gradient

## Error Handling
- [ ] Try saving with database offline (should show error alert)
- [ ] Verify error messages are descriptive

## Responsive Design
- [ ] Test on mobile viewport
- [ ] Verify fields stack properly on small screens
- [ ] Verify edit inputs are usable on mobile

## Known Issues/Limitations
- Description field may need character limit
- Value field accepts any text (no currency validation)
- No validation on required fields 