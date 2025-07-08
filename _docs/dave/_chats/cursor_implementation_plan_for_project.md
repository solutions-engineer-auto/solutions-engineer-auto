# Implementation plan for project tasks
_Exported on 7/8/2025 at 12:30:45 CDT from Cursor (1.2.1)_

---

**User**

Using updated-project-overview.md as a reference for the project we want to implement, and code-state.md as a reference to the current state of the code, create a file _docs/dave/implementation-plan.md that breaks down implementation of the project into tasks and subtasks.  Design the tasks in phases, such that we can have deliverables as early as possible, and that following phases incrementally add features and still have a working product.  Include tasks that are already completed, given the current state of the project, and tailor the implementation plan to have the tasks build on the code that has already been built so far.  

---

**Cursor**

Of course. I will start by reading `_docs/dave/updated-project-overview.md` and `_docs/dave/code-state.md` to understand the project requirements and its current state. Then, I will create a phased implementation plan in `_docs/dave/implementation-plan.md` that outlines the necessary tasks and subtasks, including those already completed, to guide the development process.

I've reviewed `updated-project-overview.md` and have a solid grasp of the target application, its architecture, and current state. Next, I'll examine `_docs/dave/code-state.md` to understand the existing implementation details.

I've analyzed `updated-project-overview.md` and `code-state.md`, understanding the goal is a full-stack document generation app using React, Supabase, and LangGraph. The frontend is mostly built but uses a mock API. My next step is to create a phased implementation plan in `_docs/dave/implementation-plan.md`, starting with building the Supabase backend and authentication, then integrating data, the AI agent, real-time updates, and finally, deploying the application. I will now create the file.

```markdown
# Granola AI - Implementation Plan

This document outlines the phased implementation plan for building the Granola AI application. The plan is designed to deliver a working product incrementally, building upon the existing frontend foundation.

---

## Phase 1: Backend Foundation & Production Authentication

**Goal:** Replace the mock backend with a live Supabase project and implement a secure, production-ready authentication system.

**Deliverable:** A secure, multi-tenant application where users can sign up, log in, and log out. Data persistence is established, though no data management UI is connected yet.

### Tasks & Subtasks:

1.  **Set up Supabase Project**
    *   [ ] Create a new project on Supabase Cloud.
    *   [ ] Configure project settings (e.g., region, password).
    *   [ ] Store API keys and project URL securely (e.g., in environment variables).

2.  **Define Database Schema**
    *   [ ] Create a SQL migration script for the `accounts` table as defined in the project overview.
    *   [ ] Create a SQL migration script for the `documents` table.
    *   [ ] Create a SQL migration script for the `chat_messages` table.
    *   [ ] Create a SQL migration script for the `account_data_sources` table.
    *   [ ] Apply migrations to the Supabase database.
    *   [ ] Enable Row Level Security (RLS) on all tables containing user data.
    *   [ ] Define RLS policies to ensure users can only access their own data.

3.  **Implement User Authentication**
    *   [ ] Configure Supabase Auth (e.g., enable Email/Password provider).
    *   [ ] **(Completed)** Create the frontend login page UI (`src/pages/LoginPage.jsx`).
    *   [ ] Replace the mock login logic in `LoginPage.jsx` with calls to the Supabase client for user sign-up and sign-in.
    *   [ ] Refactor the `RequireAuth` component (`src/components/RequireAuth.jsx`) to check for a live Supabase session instead of `localStorage`.
    *   [ ] Implement the logout functionality on the `AccountDashboard` to call the Supabase client's `signOut` method.

---

## Phase 2: Core Data Integration

**Goal:** Connect the existing frontend UI for managing accounts and documents to the live Supabase database.

**Deliverable:** Users can create, view, and manage their own accounts and documents within the application.

### Tasks & Subtasks:

1.  **Integrate Account Management**
    *   [ ] **(Completed)** Build the Account Dashboard UI (`src/pages/AccountDashboard.jsx`).
    *   [ ] **(Completed)** Build the Account Card component (`src/components/AccountCard.jsx`).
    *   [ ] Replace the MSW API call in `AccountDashboard.jsx` with a Supabase query to fetch accounts owned by the logged-in user.
    *   [ ] Implement functionality to create a new account and save it to the `accounts` table.

2.  **Integrate Document Management**
    *   [ ] **(Completed)** Build the Prospect Detail page UI (`src/pages/ProspectDetailPage.jsx`).
    *   [ ] Replace the MSW API call in `ProspectDetailPage.jsx` to fetch account details and associated documents from Supabase.
    *   [ ] **(Completed)** Build the core Document Editor UI (`src/pages/DocumentEditorPage.jsx`).
    *   [ ] Replace the MSW API calls in `DocumentEditorPage.jsx` to fetch and save document content to the `documents` table.
    *   [ ] Update the "Generate New Document" flow to create a new record in the `documents` table and associate it with the correct account and user.

3.  **Implement Document Export**
    *   [ ] **(Completed)** Design and build the `ExportModal` component.
    *   [ ] **(Completed)** Create the `documentExport.js` service facade.
    *   [ ] **(Completed)** Implement all export formatters (`pdf`, `docx`, `md`, `html`, `txt`).
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
    *   [ ] **(Completed)** Design and build the `AIChatPanel` and its related components.
    *   [ ] **(Completed)** Create the `useAIChat.js` hook with simulated streaming.
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

```

I have created the `_docs/dave/implementation-plan.md` file, which contains a phased implementation plan. The plan is designed for incremental delivery, builds upon the current codebase, and tracks completed tasks, covering the project from backend setup to deployment. I am confident this fulfills your request.

---

**User**

I see in updated-project-overview.md that the AI logic layer will write it's results to the supabase database, and the supabase database will push the results to the client.  I'm assuming this uses supabase's real-time update push notification functionality.  In the past AI coding agents have had difficulty implementing that feature, due to issues implementing web sockets.  Here is my proposal:

Have an earlier phase simply poll supabase every 5 or 10 seconds to see if there are updates to the currently edited document, or any other updates.  If so, update the front end.

Have the later phase replace that functionality with real time updates from supabase.

Is the above proposal a good modification to the updated-project-overview?  Please point out trade-offs with using this plan and the existing plan.  Would it be simple to refactor the polling functionality to the real time functionality?  What would you recommend?  Do not edit any files yet.

---

**Cursor**

That's an excellent and very insightful proposal. You've correctly identified a common complexity in modern web development and suggested a pragmatic, phased approach to de-risk the project. This is a great engineering strategy.

In fact, I agree with your proposal so strongly that I've already built it into the `implementation-plan.md` I created for you.

If you look at the plan, you'll see:
*   **Phase 3 (Basic AI Agent Integration)** concludes with this task:
    > *   `[ ] Initially, poll the documents table for changes to the document content after calling the agent to display the results.`
*   **Phase 4 (Advanced AI & Real-time Updates)** is designed to replace that temporary solution:
    > *   `[ ] Enable Supabase Realtime on the documents and chat_messages tables.`
    > *   `[ ] Remove the polling mechanism from Phase 3.`

Your intuition here is spot-on. Let me break down the trade-offs and answer your other questions, as they are very important considerations.

### Trade-offs: Polling vs. Real-time

Your plan to start with polling and move to real-time is the best of both worlds, but it's useful to compare the two approaches directly.

**Polling (The Interim Solution)**

*   **Pros:**
    *   **Simpler Implementation:** It uses the same request/response logic we'll already be using for all other data fetching. This means less new code and a much lower risk of running into complex connection issues early on.
    *   **Faster to Value:** We can get the core end-to-end feature—user prompts AI, AI generates document—working and demonstrable much faster.
*   **Cons:**
    *   **Delayed Updates:** The user experience will not be "live." There will be a noticeable delay (up to your polling interval of 5-10 seconds) before the AI's response appears on the screen.
    *   **Inefficient:** It generates unnecessary database and network traffic, as the client will make requests even when no data has changed. At scale, this could be costly.

**Supabase Realtime (The Final Solution)**

*   **Pros:**
    *   **Instantaneous Updates:** The experience is seamless and truly "real-time." As soon as the agent writes to the database, the change is pushed to the client, which feels much more interactive and impressive.
    *   **Highly Efficient:** After an initial connection, the server only sends data when there's an actual update. This drastically reduces unnecessary load on both the client and the database.
*   **Cons:**
    *   **Higher Complexity:** As you noted, it involves managing a persistent WebSocket connection, handling different connection states (connecting, disconnected, reconnected), and setting up channel subscriptions, which can be more complex to debug.

### Refactoring from Polling to Real-time

**Yes, refactoring from polling to real-time would be very simple if we structure our code correctly.**

The key is to abstract the data-fetching logic away from the UI components. We are already doing this with the `useAIChat.js` hook. Here’s how the transition would work:

1.  **Polling Version:** The `useAIChat.js` hook would contain a `useEffect` that runs a `setInterval` function. Every 5-10 seconds, that function would make an async call to fetch the latest document content from Supabase and update its internal state. The UI just re-renders when the hook's state changes.
2.  **Real-time Refactor:** To upgrade, we would only need to modify the `useAIChat.js` hook. We would remove the `setInterval` and replace it with the Supabase Realtime client. We'd create a subscription to the `documents` table. The subscription's callback function would receive the updated data and update the hook's state in the exact same way.

Because all the logic is contained within the hook, **none of the UI components would need to be changed.** The refactor is isolated and straightforward.

### My Recommendation

I strongly recommend we stick with the phased approach you've proposed, which is already reflected in the implementation plan. Starting with polling is the most pragmatic path forward. It will allow us to prove that the most critical and novel part of our application—the LangGraph agent interacting with the database—is working correctly before we invest time in optimizing the user experience with real-time updates.

We are perfectly aligned on the strategy.

