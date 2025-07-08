
# Code State Overview

This document provides a detailed overview of the codebase to assist AI agents in understanding the project for feature implementation and refactoring.

## High-Level Architecture

The project is a modern web application with a frontend built on **React** and a backend powered by **Supabase**. The architecture is designed to be modular and scalable, following best practices for web development.

- **Frontend**: A React single-page application (SPA) created with Vite.
  - **Framework**: React 18
  - **Routing**: `react-router-dom` for client-side routing.
  - **Styling**: Tailwind CSS for utility-first styling.
  - **API Mocking**: Mock Service Worker (`msw`) for development and testing.
- **Backend**: Supabase provides the database, authentication, and APIs.
  - **Database**: PostgreSQL.
  - **Authentication**: Supabase Auth handles user sign-up and sign-in.
- **Agent**: A Python-based agent, likely for automation or AI-related tasks, using the LangGraph framework.

---

## Project Structure

```
.
├── agent/
│   ├── agent.py
│   ├── langgraph.json
│   └── requirements.txt
├── public/
│   └── mockServiceWorker.js
├── src/
│   ├── App.jsx
│   ├── index.css
│   ├── main.jsx
│   ├── supabaseClient.js
│   ├── assets/
│   ├── components/
│   │   ├── AccountCard.jsx
│   │   ├── ConfirmationModal.jsx
│   │   ├── DocumentCreationModal.jsx
│   │   ├── ExportModal.jsx
│   │   ├── FileUploadDropzone.jsx
│   │   ├── RequireAuth.jsx
│   │   ├── TemplateSelectionModal.jsx
│   │   └── AIChat/
│   │       ├── AIActivityIndicator.jsx
│   │       ├── AIChatInput.jsx
│   │       ├── AIChatPanel.jsx
│   │       ├── AIMessage.jsx
│   │       └── useAIChat.js
│   ├── mocks/
│   │   ├── browser.js
│   │   └── handlers.js
│   ├── pages/
│   │   ├── AccountDashboard.jsx
│   │   ├── DocumentEditorPage.jsx
│   │   ├── LoginPage.jsx
│   │   └── ProspectDetailPage.jsx
│   └── services/
│       ├── documentExport.js
│       ├── documentProcessor.js
│       └── exportFormats/
│           ├── docxExporter.js
│           ├── htmlExporter.js
│           ├── markdownExporter.js
│           ├── pdfExporter.js
│           └── textExporter.js
└── supabase/
    └── migrations/
        ├── 20240718120000_create_accounts_table.sql
        ├── 20240718120001_create_documents_table.sql
        ├── ... (and other migrations)
```

---

## File-by-File Breakdown

### Configuration Files

- **`vite.config.js`**: Configuration file for Vite, the frontend build tool.
- **`tailwind.config.js`**: Configuration for Tailwind CSS, defining theme, plugins, etc.
- **`postcss.config.js`**: Configuration for PostCSS, used by Tailwind CSS.
- **`eslint.config.js`**: Configuration for ESLint, for code linting.
- **`package.json`**: Defines project metadata, dependencies, and scripts.

### Frontend (`src/`)

#### Entrypoint

- **`src/main.jsx`**: The main entry point of the React application. It renders the `App` component into the DOM and initializes the Mock Service Worker (`msw`) for API mocking in development environments.
- **`src/App.jsx`**: The root component of the application. It sets up client-side routing using `react-router-dom`, defining public and protected routes.

#### Supabase Client

- **`src/supabaseClient.js`**: Initializes and exports the Supabase client. It reads the Supabase URL and anonymous key from environment variables, making the client available for use across the application.

#### Pages (`src/pages/`)

- **`src/pages/LoginPage.jsx`**: The page for user authentication. It includes a form for signing in and signing up using Supabase Auth.
- **`src/pages/AccountDashboard.jsx`**: The main dashboard page, likely displaying a list of accounts after a user logs in.
- **`src/pages/ProspectDetailPage.jsx`**: A page for displaying the details of a specific prospect or account.
- **`src/pages/DocumentEditorPage.jsx`**: A page that provides an editor for creating or modifying documents associated with an account.

#### Components (`src/components/`)

- **`src/components/RequireAuth.jsx`**: A component that wraps protected routes. It checks for an active Supabase session and redirects to the login page if the user is not authenticated.
- **`src/components/AccountCard.jsx`**: A UI component to display summary information about an account on the dashboard.
- **`src/components/FileUploadDropzone.jsx`**: A component for handling file uploads with a drag-and-drop interface.
- **Modals**:
  - **`src/components/ConfirmationModal.jsx`**: A generic modal for confirming user actions.
  - **`src/components/DocumentCreationModal.jsx`**: A modal for creating new documents.
  - **`src/components/TemplateSelectionModal.jsx`**: A modal for selecting a template, likely for document creation.
  - **`src/components/ExportModal.jsx`**: A modal for handling the document export process.
- **`src/components/AIChat/`**: This directory contains components for an AI-powered chat feature.
  - **`AIChatPanel.jsx`**: The main panel for the chat interface.
  - **`AIChatInput.jsx`**: The input field for the user to type messages.
  - **`AIMessage.jsx`**: A component to display individual chat messages.
  - **`AIActivityIndicator.jsx`**: A loading indicator for when the AI is "thinking".
  - **`useAIChat.js`**: A custom React hook that encapsulates the logic for the AI chat, such as sending messages and handling state.

#### Services (`src/services/`)

- **`src/services/documentProcessor.js`**: A service for processing documents, likely containing business logic related to document manipulation.
- **`src/services/documentExport.js`**: A service that orchestrates the exporting of documents into different formats.
- **`src/services/exportFormats/`**: This directory contains the specific implementations for each export format.
  - **`docxExporter.js`**: Exports documents to DOCX format.
  - **`htmlExporter.js`**: Exports documents to HTML format.
  - **`markdownExporter.js`**: Exports documents to Markdown format.
  - **`pdfExporter.js`**: Exports documents to PDF format.
  - **`textExporter.js`**: Exports documents to plain text format.

#### Mocks (`src/mocks/`)

- **`src/mocks/browser.js`**: Sets up the Mock Service Worker for browser environments.
- **`src/mocks/handlers.js`**: Defines the mock API request handlers for `msw`. This allows the frontend to be developed and tested without a live backend.

### Backend (`supabase/`)

- **`supabase/migrations/`**: This directory contains the SQL migration files that define the database schema. Each file represents a version of the database schema, allowing for version control and easy replication. The migrations include creating tables for `accounts`, `documents`, `chat_messages`, and `account_data_sources`.

### Database Schema

Here is an overview of the database schema, derived from the migration files.

#### Tables

-   **`accounts`**: Stores account information.
    -   `id` (UUID, Primary Key): Unique identifier for the account.
    -   `name` (VARCHAR): Name of the account.
    -   `owner_id` (UUID, Foreign Key to `auth.users`): The user who owns the account.
    -   `created_at` (TIMESTAMPTZ): Timestamp of when the account was created.

-   **`documents`**: Stores documents created by users.
    -   `id` (UUID, Primary Key): Unique identifier for the document.
    -   `title` (VARCHAR): Title of the document.
    -   `content` (TEXT): The main content of the document.
    -   `document_type` (VARCHAR): The type of the document.
    -   `account_id` (UUID, Foreign Key to `accounts`): The account this document belongs to.
    -   `author_id` (UUID, Foreign Key to `auth.users`): The user who authored the document.
    -   `status` (VARCHAR): The current status of the document (e.g., 'draft').
    -   `created_at` (TIMESTAMPTZ): Timestamp of creation.
    -   `updated_at` (TIMESTAMPTZ): Timestamp of the last update, automatically updated by a trigger.

-   **`chat_messages`**: Stores messages for the AI chat feature.
    -   `id` (UUID, Primary Key): Unique identifier for the message.
    -   `document_id` (UUID, Foreign Key to `documents`): The document the chat is associated with.
    -   `role` (Enum: `'user'`, `'assistant'`): The role of the message sender.
    -   `content` (TEXT): The content of the message.
    -   `message_type` (Enum: `'thought'`, `'tool_call'`, `'response'`): The type of the message.
    -   `created_at` (TIMESTAMPTZ): Timestamp of creation.

-   **`account_data_sources`**: Stores data sources associated with an account.
    -   `id` (UUID, Primary Key): Unique identifier for the data source.
    -   `account_id` (UUID, Foreign Key to `accounts`): The account this data source belongs to.
    -   `file_name` (VARCHAR): The name of the data source file.
    -   `file_type` (TEXT): The type of the file.
    -   `metadata` (JSONB): A flexible field for storing additional metadata.
    -   `content` (TEXT): The content of the data source.
    -   `created_at` (TIMESTAMPTZ): Timestamp of creation.

#### Triggers

-   A trigger on the `documents` table automatically calls the `update_updated_at_column()` function whenever a row is updated to set the `updated_at` field to the current time.

### Agent (`agent/`)

- **`agent/agent.py`**: A Python script that likely contains the core logic for an AI agent.
- **`agent/langgraph.json`**: A configuration file for LangGraph, suggesting the agent is built using this framework for creating stateful, multi-actor applications with LLMs.
- **`agent/requirements.txt`**: A file listing the Python dependencies for the agent. 