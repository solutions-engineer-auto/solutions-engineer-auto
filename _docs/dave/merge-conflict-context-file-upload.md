# Implementation Plan: Refactor Context File Uploads to Use Supabase

This document outlines the plan to refactor the file upload functionality in `ProspectDetailPage.jsx`. The goal is to replace the current, temporary `sessionStorage` implementation with a persistent solution using the Supabase database, while minimizing architectural changes.

### Phase 1: Database Schema Verification ✅

1.  **Confirm `account_data_sources` Table Schema: ✅**
    *   As per `updated-project-overview.md`, the `account_data_sources` table should have the following key columns. We will verify they exist in the Supabase schema:
        *   `id` (uuid, primary key)
        *   `account_id` (uuid, foreign key to `accounts.id`)
        *   `file_name` (text)
        *   `file_type` (text)
        *   `content` (text, to store the processed HTML)
        *   `metadata` (jsonb, for any other extracted metadata)
        *   `created_at` (timestamp with time zone)
    *   If any columns are missing, a new migration will be created to align the table with the schema defined in the project overview.

### Phase 2: Refactor File Upload Logic in `ProspectDetailPage.jsx` ✅

1.  **Modify `handleFileSelect` Function: ✅**
    *   The existing client-side logic where `documentProcessor.processFile(file)` is called to generate HTML will be maintained.
    *   **Remove `sessionStorage` Logic:** All code that reads from or writes to `sessionStorage` related to uploaded documents will be removed.
    *   **Insert to Supabase:** After the `documentProcessor` successfully returns the HTML content, a Supabase client call will be made to insert a new record directly into the `account_data_sources` table.

    ```javascript
    // Pseudocode for the new logic inside handleFileSelect
    const { html, metadata } = await documentProcessor.processFile(file);

    const { error } = await supabase
      .from('account_data_sources')
      .insert({
        account_id: account.id,
        file_name: file.name,
        file_type: file.type,
        content: html,      // The processed HTML
        metadata: metadata  // Other extracted metadata
      });

    if (error) {
      // Handle the insertion error in the UI
    } else {
      // Refresh the list of data sources to show the new file
      fetchAccountDataSources(); 
    }
    ```

2.  **Display Context Files from Database: ✅**
    *   The component's state will be modified to hold the list of context files fetched from the database (e.g., `const [dataSources, setDataSources] = useState([])`).
    *   A function, `fetchAccountDataSources`, will be created to query the `account_data_sources` table for all records matching the current `account_id`.
    *   This function will be called in a `useEffect` hook when the component first loads and will be called again to refresh the list after a new file is successfully uploaded.
    *   The UI will be updated to render the list of files from the `dataSources` state variable, replacing the old logic that used `uploadedDocuments` from `sessionStorage`.

### Phase 3: Update the User Interface in `ProspectDetailPage.jsx` ✅

1.  **Disable "Edit in Editor" Button: ✅**
    *   Locate the "Edit in Editor" button within the rendered list of processed documents.
    *   The button will be disabled. We can add a `disabled` attribute and styling to indicate that it is not currently functional. A tooltip explaining that this feature is planned for the future could also be added. 