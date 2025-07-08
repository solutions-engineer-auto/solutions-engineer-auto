# Codebase Overview

This document provides a detailed overview of the codebase for an AI coding agent. It outlines the project's architecture, key dependencies, and the purpose of each major file and directory.

## High-Level Architecture

The project is a modern, single-page React application built with Vite and styled with Tailwind CSS. It is designed as a tool for solution engineers to automate document generation. The architecture follows a standard frontend setup with a clear separation of concerns.

-   **Framework:** React 19
-   **Build Tool:** Vite
-   **Styling:** Tailwind CSS with PostCSS
-   **State Management:** Zustand (though not explicitly used in the files reviewed, it's a dependency)
-   **Routing:** React Router DOM
-   **Rich-Text Editing:** TipTap
-   **API Mocking:** Mock Service Worker (MSW)

The application is structured around a few core concepts:

1.  **Authentication:** A simple, demo-oriented authentication flow that uses `localStorage` to persist a user ID. Protected routes are wrapped in a `RequireAuth` component.
2.  **Account Management:** The application displays a dashboard of accounts, each representing a prospect or customer. Users can view account details and associated documents.
3.  **Document Generation & Editing:** The core feature is a rich-text editor (built with TipTap) for creating and editing documents related to an account. These documents can be generated based on account data (a feature that is mocked).
4.  **AI Integration:** The application includes a sophisticated AI chat panel that is context-aware (it can use the content of the document being edited). It also has a UI for AI-powered text regeneration, although the backend for this is not yet integrated.
5.  **Document Export:** Users can export documents in various formats (PDF, DOCX, Markdown, HTML, and plain text), with a range of customization options.

## File-by-File Breakdown

This section details the purpose and functionality of each significant file in the repository.

### `package.json`

-   **Purpose:** Defines the project's metadata, dependencies, and scripts.
-   **Key Dependencies:**
    -   `react`, `react-dom`: Core React libraries.
    -   `vite`: The build tool and development server.
    -   `tailwindcss`, `postcss`, `autoprefixer`: For styling.
    -   `react-router-dom`: For client-side routing.
    -   `@tiptap/react` and related extensions: For the rich-text editor.
    -   `msw`: For mocking API requests in development.
    -   `docx`, `file-saver`, `html2pdf.js`, `turndown`: For document export functionality.
    -   `zustand`: For state management.
-   **Scripts:**
    -   `dev`: Starts the Vite development server.
    -   `build`: Builds the application for production.
    -   `lint`: Lints the codebase with ESLint.
    -   `preview`: Serves the production build locally.

### `vite.config.js`

-   **Purpose:** Configures the Vite build tool.
-   **Details:** It's a standard Vite configuration for a React project, using the `@vitejs/plugin-react` plugin.

### `tailwind.config.js` and `postcss.config.js`

-   **Purpose:** Configure Tailwind CSS and PostCSS.
-   **Details:** These files set up the styling pipeline. `tailwind.config.js` would contain any customizations to the default Tailwind theme, and `postcss.config.js` loads the Tailwind and autoprefixer plugins.

### `src/main.jsx`

-   **Purpose:** The entry point of the application.
-   **Details:** It initializes the Mock Service Worker in development environments and renders the root `<App />` component into the DOM.

### `src/App.jsx`

-   **Purpose:** The root component of the application.
-   **Details:** It sets up the main application layout and configures all the client-side routes using `react-router-dom`. It defines which routes are public and which are protected by the `<RequireAuth />` component.

### `src/index.css`

-   **Purpose:** Contains global CSS styles and Tailwind CSS imports.
-   **Details:** This file imports the base, components, and utilities layers of Tailwind CSS and would be the place for any custom global styles.

---

### Pages (`src/pages/`)

The `pages` directory contains the top-level components for each route in the application.

#### `LoginPage.jsx`

-   **Purpose:** Provides a login interface for the user.
-   **Details:** In its current form, it's a demo login page with a single button that sets a mock user ID in `localStorage` and redirects the user to the `/accounts` dashboard. It explicitly mentions that production will use OAuth.

#### `AccountDashboard.jsx`

-   **Purpose:** Displays a dashboard of all accounts.
-   **Details:** This page fetches a list of accounts from the mock API (`/api/accounts`) and displays them as a grid of `AccountCard` components. It includes functionality to filter accounts by their stage (e.g., "Discovery", "Pre-Sales") and a logout button that clears the user ID from `localStorage`.

#### `ProspectDetailPage.jsx`

-   **Purpose:** Shows the detailed view for a single account/prospect.
-   **Details:** This page fetches detailed information for a specific account, including a list of associated documents. It provides the primary interface for a user to either view existing documents or generate a new one. The "Generate New Document" button simulates an AI-powered document creation process and navigates the user to the `DocumentEditorPage`.

#### `DocumentEditorPage.jsx`

-   **Purpose:** The core of the application, providing a rich-text editor for documents.
-   **Details:** This is a large and complex component that integrates a TipTap editor with numerous extensions for formatting (headings, lists, code blocks, etc.).
-   **Key Features:**
    -   Fetches and saves document content to the mock API.
    -   A comprehensive formatting toolbar.
    -   Handles document status changes (e.g., "Draft", "Finalized"). The "Finalized" status makes the editor read-only.
    -   Integrates the `AIChatPanel` and an `ExportModal`.
    -   Includes keyboard shortcuts for saving (`Cmd+S`), opening the AI chat (`Cmd+Shift+L`), and a placeholder for AI text regeneration (`Cmd+K`).

---

### Components (`src/components/`)

This directory contains reusable UI components.

#### `RequireAuth.jsx`

-   **Purpose:** A higher-order component that protects routes.
-   **Details:** It checks for the presence of `userId` in `localStorage`. If it's not found, the user is redirected to the `/login` page. Otherwise, it renders the child components.

#### `AccountCard.jsx`

-   **Purpose:** Displays a summary of an account on the dashboard.
-   **Details:** A presentational component that takes an `account` object and an `onClick` handler. It uses helper functions to apply consistent coloring to status and stage badges, creating a visually consistent UI.

#### `ExportModal.jsx`

-   **Purpose:** Provides the UI for exporting documents.
-   **Details:** This modal allows the user to select an export format and configure various options, such as filename, metadata, and page styling. It uses the functions from `documentExport.js` to handle the actual export logic and to display a preview.

#### AI Chat Components (`src/components/AIChat/`)

This sub-directory contains all the components related to the AI chat feature.

-   **`useAIChat.js`:** A custom hook that encapsulates the logic for the chat, including managing messages, handling user input, and simulating the AI's response stream. It is designed to be easily adaptable to a real backend.
-   **`AIChatPanel.jsx`:** The main UI for the chat panel. It's a resizable and minimizable panel that uses the `useAIChat` hook. It intelligently adds the current document's content as context for the first message.
-   **`AIMessage.jsx`:** Renders an individual chat message, with different styling for user and AI messages. It uses `react-markdown` and `react-syntax-highlighter` to display formatted content and code blocks.
-   **`AIActivityIndicator.jsx`:** Displays the current (simulated) activity of the AI, such as "Thinking..." or "Reading document...", providing useful feedback to the user.
-   **`AIChatInput.jsx`:** A controlled component for the chat input, featuring an auto-resizing textarea and handling for the `Enter` key to send messages.

---

### Services (`src/services/`)

This directory contains modules for handling business logic and external interactions.

#### `documentExport.js`

-   **Purpose:** Acts as a facade for all document export operations.
-   **Details:** This module abstracts the details of the different export formats. It defines the available formats and their metadata, provides a single `exportDocument` function that delegates to the appropriate exporter, and includes helper functions for generating previews, validating options, and estimating file sizes.

#### Export Formatters (`src/services/exportFormats/`)

This sub-directory contains the specific logic for each export format.

-   **`pdfExporter.js`:** Uses the `html2pdf.js` library to convert the editor's HTML content into a PDF. It includes extensive CSS to ensure the PDF is well-formatted for printing and professional use.
-   **`docxExporter.js`:** Uses the `docx` library to convert HTML to a `.docx` file. It does this by parsing the HTML and creating corresponding `docx` objects for paragraphs, headings, etc.
-   **`markdownExporter.js`:** Uses the `turndown` library to convert HTML to Markdown. It includes custom rules to handle specific HTML elements and adds a YAML front-matter header for metadata.
-   **`htmlExporter.js` and `textExporter.js`:** These files (not explicitly reviewed but inferred from `documentExport.js`) would handle the simpler conversions to raw HTML and plain text, likely by cleaning the editor's HTML or simply saving its text content.

### Mock API (`src/mocks/`)

-   **`handlers.js`:** Defines all the mock API endpoints using Mock Service Worker. This includes endpoints for fetching accounts, getting document details, generating new documents, and handling exports. The data returned by these handlers provides a clear picture of the application's data models.
-   **`browser.js`:** Sets up and starts the MSW worker in the browser.

## Conclusion

This codebase represents a well-architected and feature-rich React application. The separation of concerns is clear, with distinct layers for UI components, page-level views, and services. The use of a facade pattern in `documentExport.js` is a particularly good design choice, as it simplifies the process of adding new export formats. The AI features, while currently simulated, are designed in a modular way that will make backend integration straightforward. The code is clean, readable, and follows modern React best practices. 