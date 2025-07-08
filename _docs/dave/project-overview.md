### 1\. Common User Flows

This section outlines the primary paths a user will take through the application.

* **Onboarding & Authentication:**  
  1. A new user signs up for the service via the front-end interface.  
  2. The user receives a verification email and confirms their account.  
  3. The user logs in with their credentials.  
  4. The system, using the Supabase client, authenticates the user and establishes a session.  
* **Account and Document Management:**  
  1. Upon login, the user is presented with a dashboard of their associated accounts.  
  2. The user can select an existing account to work on or create a new one.  
  3. Within an account, the user sees a list of existing documents and options to create a new one.  
  4. The user can initiate a new document in one of two ways:  
     * **Create from Template:** The user selects a pre-defined template (e.g., "New Statement of Work," "New RFP Response").  
     * **Create Blank Document:** The user opts for a blank editor to start from scratch.  
  5. The user opens the newly created or an existing document to enter the main editor view.  
* Document Generation & AI Interaction (Core Flow):  
  The AI's behavior adapts based on how the document was initiated.  
  * **Scenario A: Generating from a Template (Primary Flow)**  
    1. The user creates a document from a template (e.g., "New Statement of Work"). A new document is created with its document\_type pre-set to 'SOW' and the editor is populated with the template's headers.  
    2. The user provides a prompt, which is a conversational shortcut for populating the template: "Generate a Statement of Work for Project Phoenix."  
    3. The LangGraph agent receives the prompt. Seeing the document is already classified as an SOW, it understands its job is to **populate** the existing sections.  
    4. The agent writes its thinking to the chat: "Okay, I will populate this Statement of Work for Project Phoenix. I'll start by looking up the discovery notes." This is pushed to the client in real-time via Supabase.  
    5. The agent executes tool calls (e.g., to find reference materials) and writes the results to the documents table, filling in the template. The client sees the editor update in real-time.  
  * **Scenario B: Generating from a Blank Document (Flexible Flow)**  
    1. The user creates a blank document. The document\_type is initially NULL.  
    2. The user provides a clear, generative prompt: "Generate a Statement of Work for Project Phoenix."  
    3. The LangGraph agent receives the prompt and understands it has two tasks:  
       * **Generation:** Create the full content and structure for a standard SOW.  
       * **Classification:** Update the document's document\_type in the database to 'SOW'.  
    4. The agent streams the generated content into the document editor and sets the document type, providing structure for all future interactions.  
  * **Advanced Feature: Proactive AI Classification**  
    * In Scenario B, if the user provides a *vague* prompt ("Let's get the paperwork for Project Phoenix started..."), the agent can analyze the language, infer the likely document type, and proactively ask the user for confirmation in the chat: "It looks like you're starting a Statement of Work. Is that correct? I can apply the standard SOW template to get you started."

### 2\. Database Schema

The database will be a managed PostgreSQL instance provided by Supabase. A multi-tenant approach using a shared schema is recommended. A userId and accountId will be used to isolate data.

**Tables:**

* **users**  
  * id (UUID, Primary Key)  
  * email (VARCHAR, UNIQUE, NOT NULL)  
  * full\_name (VARCHAR)  
  * created\_at (TIMESTAMP)  
  * updated\_at (TIMESTAMP)  
  * *(Note: Supabase's auth.users table handles this automatically)*  
* **accounts**  
  * id (UUID, Primary Key)  
  * name (VARCHAR, NOT NULL)  
  * owner\_id (UUID, Foreign Key to auth.users.id)  
  * created\_at (TIMESTAMP)  
  * updated\_at (TIMESTAMP)  
* **documents**  
  * id (UUID, Primary Key)  
  * title (VARCHAR, NOT NULL)  
  * content (TEXT or JSONB for rich text)  
  * account\_id (UUID, Foreign Key to accounts.id, Index)  
  * author\_id (UUID, Foreign Key to auth.users.id)  
  * document\_type (e.g., 'SOW', 'RFP\_Response', can be NULL initially)  
  * created\_at (TIMESTAMP)  
  * updated\_at (TIMESTAMP)  
* **chat\_messages**  
  * id (UUID, Primary Key)  
  * document\_id (UUID, Foreign Key to documents.id, Index)  
  * role (ENUM: 'user', 'assistant')  
  * content (TEXT)  
  * message\_type (ENUM: 'thought', 'tool\_call', 'response')  
  * created\_at (TIMESTAMP)  
* **account\_data\_sources** (For storing reference material)  
  * id (UUID, Primary Key)  
  * account\_id (UUID, Foreign Key to accounts.id, Index)  
  * source\_type (VARCHAR, e.g., 'Discovery Questionnaire', 'Email')  
  * content (TEXT)  
  * source\_url (VARCHAR, optional)  
  * created\_at (TIMESTAMP)

### 3\. API Endpoints

The backend is managed by Supabase and LangGraph Cloud, eliminating the need for a custom API server.

* **Supabase Auto-Generated API:**  
  * Supabase provides a RESTful API for all database tables out of the box. The frontend will use the Supabase client library (JS/TS) to interact with this API for all standard CRUD (Create, Read, Update, Delete) operations on accounts, documents, and account\_data\_sources.  
  * Authentication is handled via Supabase's built-in auth service and client library.  
* **LangGraph Cloud Agent Endpoint:**  
  * POST https://\<your-langgraph-cloud-url\>/agent/invoke  
  * This is the single, primary endpoint for all AI-related tasks. The frontend will call this endpoint directly.  
  * **Request Body:** { "documentId": "...", "prompt": "..." }  
  * **Authentication:** The LangGraph agent can be protected if needed, and the frontend would include a user's JWT in the Authorization header.

### 4\. Tech Stack

* **Backend-as-a-Service (BaaS):** [Supabase](https://supabase.com/)  
  * **Database:** Managed PostgreSQL  
  * **Authentication:** Supabase Auth  
  * **Real-time Layer:** Supabase Realtime  
  * **File Storage:** Supabase Storage (for reference documents)  
* **AI Agent Platform:** [LangGraph Cloud](https://www.langchain.com/langgraph)  
  * **Framework:** LangGraph  
  * **LLM:** Any model supported by LangChain (e.g., OpenAI, Anthropic, Google). LLM API keys will be stored securely as secrets within the LangGraph Cloud environment.  
* **Frontend:** React (with a framework like Next.js for structure)  
* **Document Editor:** A rich-text editor library like TipTap, Slate.js, or Quill.js.  
* **UI Components:** A component library like Material-UI, Ant Design, or Shadcn/ui for rapid development.  
* **Deployment:**  
  * **Frontend:** Vercel or Netlify.  
  * **AI Agent:** Deployed and managed within LangGraph Cloud.  
  * **BaaS:** Managed entirely by Supabase.

### 5\. High-Level Software Architecture

This architecture is fully "serverless," meaning you do not manage any traditional, always-on backend servers. It consists of three main components that communicate directly.

1. **Client (React App):** The user interface. It is the central orchestrator.  
   * It uses the Supabase client library to handle user authentication and perform all database operations (creating accounts, fetching documents, etc.).  
   * It establishes a real-time WebSocket connection to Supabase to listen for changes in the chat\_messages and documents tables.  
   * When the user sends a prompt, it makes a direct, authenticated API call to the LangGraph Cloud agent's endpoint.  
2. **Backend-as-a-Service (Supabase):** The data and real-time hub.  
   * Provides the managed PostgreSQL database.  
   * Provides all authentication and data APIs.  
   * Its primary role in the AI workflow is to act as a "message bus." When the LangGraph agent updates the database, Supabase's Realtime engine instantly pushes those changes to the connected client.  
3. **AI Logic Layer (LangGraph Cloud):** The "brain" of the application.  
   * It exposes a secure API endpoint that the client calls.  
   * It contains all the logic for the AI agent, including its state machine, tool definitions, and prompts.  
   * It securely stores and uses LLM API keys and its own Supabase service key (for privileged database access).  
   * When invoked, it queries the Supabase database for context, calls external LLMs, and writes its intermediate and final results back to the Supabase database. It does **not** send data directly back to the client; it communicates indirectly via the shared Supabase database.

### 6\. Front-End Layout and Design

The main interface will be a two-column layout.

* **Left Column (70% width): Document Editor**  
  * A clean, "what you see is what you get" (WYSIWYG) editor.  
  * Standard formatting controls (headings, bold, lists, etc.).  
  * The document title is displayed prominently at the top.  
  * A "Save Status" indicator (e.g., "Saving...", "All changes saved").  
* **Right Column (30% width): AI Chat Sidebar**  
  * A scrollable chat history window.  
  * User prompts are right-aligned.  
  * AI responses are left-aligned.  
  * Special formatting for AI's intermediate steps:  
    * **Thinking:** Displayed in a distinct, perhaps italicized or low-contrast text block. \*Thinking: I need to find the relevant data...\*  
    * **Tool Calls:** Displayed in a structured, code-like block with a clear visual indicator.  
  * A text input field at the bottom for the user to type their prompts.  
  * A "Send" button.