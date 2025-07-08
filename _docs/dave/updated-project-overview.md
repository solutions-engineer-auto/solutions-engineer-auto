### 1\. Common User Flows

This section outlines the primary paths a user will take through the application, reflecting the current implementation and the planned backend integration.

* **Onboarding & Authentication:**  
  1.  **Current:** A user navigates to the login page and clicks a single "Login" button. This action stores a mock `userId` in `localStorage` and grants access to the application.
  2.  **Planned:** This flow will be replaced by a production-ready authentication system using Supabase Auth, supporting either email/password or OAuth providers. The frontend's `<RequireAuth>` component is already in place to protect routes.

* **Account and Document Management:**  
  1.  Upon login, the user is directed to the `AccountDashboard`, which fetches and displays a grid of accounts from a mock API.
  2.  The user can select an existing account, which navigates them to the `ProspectDetailPage`.
  3.  Within the prospect detail view, the user sees account information and a list of associated documents.
  4.  The user clicks the "Generate New Document" button. This simulates an AI-driven creation process and navigates them to the `DocumentEditorPage` with a new document.

* **Document Generation & AI Interaction (Core Flow):**  
  The frontend UI for AI interaction is fully built, featuring a resizable and context-aware chat panel. The current implementation uses a `useAIChat` hook to simulate a streaming AI response. The following scenarios describe the **target behavior** this UI is designed to support once connected to the LangGraph backend.

  * **Scenario A: Generating from a Template (Primary Flow)**  
    1.  A user action (e.g., selecting a "Statement of Work" template) creates a new document. The document's `document_type` is pre-set to 'SOW', and the editor is populated with the template's headers.
    2.  The user provides a prompt: "Generate a Statement of Work for Project Phoenix."
    3.  The LangGraph agent receives the prompt. Seeing the document is classified as an SOW, it understands its job is to **populate** the existing sections.
    4.  The agent writes its thinking to the `chat_messages` table: "Okay, I will populate this Statement of Work for Project Phoenix..." This is pushed to the client in real-time via Supabase.
    5.  The agent executes tool calls and writes the results to the `documents` table, filling in the template. The client's editor updates in real-time.

  * **Scenario B: Generating from a Blank Document (Flexible Flow)**  
    1.  The user creates a blank document. The `document_type` is initially NULL.
    2.  The user provides a clear, generative prompt: "Generate a Statement of Work for Project Phoenix."
    3.  The LangGraph agent receives the prompt and understands it has two tasks:
        *   **Generation:** Create the full content and structure for a standard SOW.
        *   **Classification:** Update the document's `document_type` in the database to 'SOW'.
    4.  The agent streams the generated content into the document editor and sets the document type.

### 2\. Database Schema

The database will be a managed PostgreSQL instance provided by Supabase. The current mock API (`src/mocks/handlers.js`) implements a simplified version of these data models. A multi-tenant approach using a shared schema with `userId` and `accountId` for data isolation is the target.

**Tables:**

* **users**  
  * *(Note: Supabase's auth.users table handles this automatically)*
* **accounts**  
  * id (UUID, Primary Key)  
  * name (VARCHAR, NOT NULL)  
  * owner\_id (UUID, Foreign Key to auth.users.id)  
  * ...
* **documents**  
  * id (UUID, Primary Key)  
  * title (VARCHAR, NOT NULL)  
  * content (TEXT or JSONB for rich text)  
  * account\_id (UUID, Foreign Key to accounts.id, Index)  
  * author\_id (UUID, Foreign Key to auth.users.id)  
  * document\_type (e.g., 'SOW', 'RFP\_Response', can be NULL initially)  
  * ...
* **chat\_messages**  
  * id (UUID, Primary Key)  
  * document\_id (UUID, Foreign Key to documents.id, Index)  
  * role (ENUM: 'user', 'assistant')  
  * content (TEXT)  
  * message\_type (ENUM: 'thought', 'tool\_call', 'response')  
  * ...
* **account\_data\_sources** (For storing reference material)  
  * id (UUID, Primary Key)  
  * account\_id (UUID, Foreign Key to accounts.id, Index)  
  * ...

### 3\. API Endpoints

The backend is planned to be managed by Supabase and LangGraph Cloud. Currently, the frontend uses **Mock Service Worker (MSW)** to simulate these API interactions for rapid development.

*   **Supabase Auto-Generated API:**  
    *   The frontend will use the Supabase client library for all standard CRUD operations on accounts, documents, etc., replacing the current MSW handlers.
*   **LangGraph Cloud Agent Endpoint:**  
    *   `POST https://<your-langgraph-cloud-url>/agent/invoke`
    *   This is the single, primary endpoint for all AI-related tasks. The `useAIChat.js` hook is designed to be easily adapted to call this endpoint.
    *   **Request Body:** `{ "documentId": "...", "prompt": "..." }`

### 4\. Tech Stack

*   **Backend-as-a-Service (BaaS):** [Supabase](https://supabase.com/) (Planned)
    *   **Database:** Managed PostgreSQL
    *   **Authentication:** Supabase Auth
    *   **Real-time Layer:** Supabase Realtime
*   **AI Agent Platform:** [LangGraph Cloud](https://www.langchain.com/langgraph) (Planned)
    *   **Framework:** LangGraph
    *   **LLM:** Any model supported by LangChain.
*   **Frontend:** React
    *   **Build Tool:** Vite
    *   **Routing:** React Router DOM
    *   **State Management:** Zustand
    *   **Document Editor:** TipTap
    *   **Styling:** Tailwind CSS
*   **Deployment:**
    *   **Frontend:** Vercel or Netlify.
    *   **AI Agent:** Deployed and managed within LangGraph Cloud.
    *   **BaaS:** Managed entirely by Supabase.

### 5\. High-Level Software Architecture

This architecture is "serverless," consisting of three main components. The client has been built with a mocked API layer that simulates the BaaS and AI components.

1.  **Client (React App):** The user interface.
    *   It uses MSW to mock API calls for database operations. This will be replaced with the Supabase client library.
    *   The `useAIChat.js` hook currently simulates a streaming AI chat. This will be adapted to make an authenticated API call to the LangGraph Cloud agent.
    *   The UI is designed to react to data changes and is ready for real-time updates (planned via Supabase Realtime).
2.  **Backend-as-a-Service (Supabase):** The planned data and real-time hub.
    *   Provides the managed PostgreSQL database and all data APIs.
    *   Its primary role in the AI workflow is to act as a "message bus." When the LangGraph agent updates the database, Supabase's Realtime engine will instantly push those changes to the connected client.
3.  **AI Logic Layer (LangGraph Cloud):** The planned "brain" of the application.
    *   It will expose a secure API endpoint that the client calls.
    *   It will query the Supabase database for context, call LLMs, and write its results back to the Supabase database, which then get pushed to the client.

### 6\. Front-End Layout and Design

The main interface is built around the `DocumentEditorPage`.

*   **Main Column: Document Editor**
    *   A clean WYSIWYG editor powered by TipTap.
    *   Features a comprehensive formatting toolbar and handles document status (e.g., read-only when "Finalized").
*   **Resizable Sidebar: AI Chat Panel**
    *   A dynamic AI chat sidebar that can be resized or minimized by the user.
    *   Displays a scrollable chat history, with distinct styling for user and AI messages, including support for markdown and code blocks.
    *   An input field at the bottom for user prompts.

### 7\. Document Export (Implemented Feature)

A major feature that has been fully implemented on the frontend is document exporting.

*   **Export Modal:** A user-friendly modal allows the selection of various export formats.
*   **Formats Supported:** PDF, DOCX, Markdown, HTML, and Plain Text.
*   **Customization:** Users can configure options like filename, metadata, and page styling.
*   **Architecture:** The `documentExport.js` service acts as a facade, cleanly abstracting the logic for each format into its own module (`pdfExporter.js`, `docxExporter.js`, etc.). This makes the system easily extensible.

### 8\. Recommendations for Backend Adaptation

To make the transition from the mocked frontend to the planned backend smoother, the following frontend changes are recommended:

*   **Introduce `document_type`:** The concept of `document_type` is central to the planned AI logic but is absent in the current UI flow.
    *   **Suggestion:** Add a `document_type` property to the document objects in the mock API. When generating a new document, the UI should allow the user to select a type. This will ensure the frontend is already passing this critical piece of information to the future backend agent.
*   **Refactor `useAIChat` for easier backend swapping:** The `useAIChat.js` hook currently contains the simulation logic directly.
    *   **Suggestion:** Refactor the hook to subscribe to a simple, generic event emitter or pub/sub system for receiving messages. A separate module would be responsible for publishing events (either from the current simulation or, in the future, from a Supabase Realtime subscription). This would decouple the UI from the data source, allowing a seamless switch to the live backend without changing any UI components. 