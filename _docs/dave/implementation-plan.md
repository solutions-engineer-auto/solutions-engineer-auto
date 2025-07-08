# Granola AI - Implementation Plan

This document outlines the phased implementation plan for building the Granola AI application. The plan is designed to deliver a working product incrementally, building upon the existing frontend foundation.

---

## Phase 1: Backend Foundation & Production Authentication

**Goal:** Replace the mock backend with a live Supabase project and implement a secure, production-ready authentication system.

**Deliverable:** A secure, multi-tenant application where users can sign up, log in, and log out. Data persistence is established, though no data management UI is connected yet.

### Tasks & Subtasks:

1.  **Set up Supabase Project**
    *   [X] Create a new project on Supabase Cloud.
    *   [X] Configure project settings (e.g., region, password).
    *   [X] Store API keys and project URL securely (e.g., in environment variables).

2.  **Define Database Schema**
    *   [X] Create a SQL migration script for the `accounts` table as defined in the project overview.
    *   [X] Create a SQL migration script for the `documents` table.
    *   [X] Create a SQL migration script for the `chat_messages` table.
    *   [X] Create a SQL migration script for the `account_data_sources` table.
    *   [X] Apply migrations to the Supabase database.
    *   [X] Enable Row Level Security (RLS) on all tables containing user data.
    *   [X] Define RLS policies to ensure users can only access their own data.

3.  **Implement User Authentication**
    *   [ ] Configure Supabase Auth (e.g., enable Email/Password provider).
    *   [ ] **✅** Create the frontend login page UI (`src/pages/LoginPage.jsx`).
    *   [ ] Replace the mock login logic in `LoginPage.jsx` with calls to the Supabase client for user sign-up and sign-in.
    *   [ ] Refactor the `RequireAuth` component (`src/components/RequireAuth.jsx`) to check for a live Supabase session instead of `localStorage`.
    *   [ ] Implement the logout functionality on the `AccountDashboard` to call the Supabase client's `signOut` method.

---

## Phase 2: Core Data Integration

**Goal:** Connect the existing frontend UI for managing accounts and documents to the live Supabase database.

**Deliverable:** Users can create, view, and manage their own accounts and documents within the application.

### Tasks & Subtasks:

1.  **Integrate Account Management**
    *   [ ] **✅** Build the Account Dashboard UI (`src/pages/AccountDashboard.jsx`).
    *   [ ] **✅** Build the Account Card component (`src/components/AccountCard.jsx`).
    *   [ ] Replace the MSW API call in `AccountDashboard.jsx` with a Supabase query to fetch accounts owned by the logged-in user.
    *   [ ] Implement functionality to create a new account and save it to the `accounts` table.

2.  **Integrate Document Management**
    *   [ ] **✅** Build the Prospect Detail page UI (`src/pages/ProspectDetailPage.jsx`).
    *   [ ] Replace the MSW API call in `ProspectDetailPage.jsx` to fetch account details and associated documents from Supabase.
    *   [ ] **✅** Build the core Document Editor UI (`src/pages/DocumentEditorPage.jsx`).
    *   [ ] Replace the MSW API calls in `DocumentEditorPage.jsx` to fetch and save document content to the `documents` table.
    *   [ ] Update the "Generate New Document" flow to create a new record in the `documents` table and associate it with the correct account and user.

3.  **Implement Document Export**
    *   [ ] **✅** Design and build the `ExportModal` component.
    *   [ ] **✅** Create the `documentExport.js` service facade.
    *   [ ] **✅** Implement all export formatters (`pdf`, `docx`, `md`, `html`, `txt`).
    *   *Note: This feature is fully implemented on the frontend and should work correctly once document data is being fetched from Supabase.*

---

## Phase 3: Basic AI Agent Integration

**Goal:** Connect the frontend AI chat to a live LangGraph agent to enable core document generation.

**Deliverable:** A user can start with a blank document, issue a prompt, and have the AI agent generate the content and structure of the document.

### Tasks & Subtasks:

1.  **Set up LangGraph Agent**
    *   [ ] Create a new agent on LangGraph Cloud.
    *   [ ] Grant the agent secure access to the Supabase database.
    *   [ ] Implement the basic "Generate from Blank Document" logic in the agent.
        *   The agent should be able to receive a `documentId` and a `prompt`.
        *   The agent should update the `content` of the specified document in the database.
        *   The agent should be able to classify the document and update the `document_type` field.

2.  **Connect Frontend to Agent**
    *   [ ] **✅** Design and build the `AIChatPanel` and its related components.
    *   [ ] **✅** Create the `useAIChat.js` hook with simulated streaming.
    *   [ ] Refactor `useAIChat.js` to make a secure, authenticated `POST` request to the LangGraph Cloud agent endpoint.
    *   [ ] Initially, poll the `documents` table for changes to the document content after calling the agent to display the results.

---

## Phase 4: Advanced AI & Real-time Updates

**Goal:** Enhance the AI with more sophisticated capabilities and use Supabase Realtime for a seamless, interactive user experience.

**Deliverable:** The AI can intelligently populate pre-defined templates, and all updates from the agent (thoughts, tool calls, content changes) appear in the UI in real-time without polling.

### Tasks & Subtasks:

1.  **Enable Real-time Updates**
    *   [ ] Enable Supabase Realtime on the `documents` and `chat_messages` tables.
    *   [ ] Refactor `useAIChat.js` to subscribe to changes on the `documents` table for the currently opened document.
    *   [ ] Create a subscription in `AIChatPanel.jsx` to listen for new rows in the `chat_messages` table associated with the current document.
    *   [ ] Display incoming messages from the `chat_messages` subscription in the chat UI.
    *   [ ] Remove the polling mechanism from Phase 3.

2.  **Implement Advanced Agent Logic**
    *   [ ] Update the LangGraph agent to handle the "Generate from a Template" flow.
        *   The agent must detect the `document_type` and understand its job is to populate, not generate from scratch.
    *   [ ] Implement the agent's "chain-of-thought" process, where it writes its thinking process to the `chat_messages` table before executing actions. This will be picked up by the real-time subscription on the frontend.
    *   [ ] Introduce the concept of `document_type` to the frontend when creating a new document, allowing users to select a template.

---

## Phase 5: Refinement, Testing, and Deployment

**Goal:** Prepare the application for production release.

**Deliverable:** A stable, tested, and deployed application accessible to users.

### Tasks & Subtasks:

1.  **Finalize and Test**
    *   [ ] Conduct end-to-end testing of all user flows.
    *   [ ] Perform UI/UX review and polish.
    *   [ ] Write unit and integration tests for critical components and services.
    *   [ ] Remove all MSW-related code from the production build.

2.  **Deployment**
    *   [ ] Configure production environment variables for the frontend.
    *   [ ] Deploy the React frontend to a hosting provider (e.g., Vercel, Netlify).
    *   [ ] Ensure the LangGraph Cloud agent is running in its production environment.
    *   [ ] Final verification of the deployed application. 