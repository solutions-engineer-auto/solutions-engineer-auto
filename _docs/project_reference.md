
# 🧱 Project Reference — Tech Stack & Team Responsibilities

> This document tells Cursor what technologies to use and — more importantly — what NOT to build. Cursor should always stay within scope and defer out-of-scope tasks to the proper team member.

---

## 👨‍💻 YOUR ROLE (Cursor / Frontend)

You are responsible for:
- Creating a professional, single-user React frontend
- Mocking API responses using MSW
- Integrating TipTap for document editing
- Implementing upload, document lifecycle, and export UI
- Handling component logic, document state, routing, and styling

You are **not responsible** for:
- Backend storage
- AI agent document generation
- File parsing
- Real-time syncing or collaboration
- Salesforce integrations

---

## 🧰 Tech Stack (Frontend)

| Layer              | Tech Used                                  |
|-------------------|---------------------------------------------|
| UI Framework       | React (with Vite)                           |
| Styling            | TailwindCSS                                 |
| Editor             | TipTap (HTML-based WYSIWYG)                 |
| File Upload        | React DnD / native drag-and-drop API       |
| Routing            | React Router                                |
| State Management   | Zustand or React Context (no Redux needed) |
| Mocking Layer      | MSW (Mock Service Worker)                   |
| Export Support     | `html-docx-js` (frontend) or call API       |

---

## 👥 Team Responsibilities

### 🧠 AI Agent Engineer
Responsible for:
- Prompting and generating content for documents
- Ingesting uploaded files (PDF, DOCX, TXT)
- Responding to frontend prompts and edits
- Managing context memory and regeneration logic

APIs they own:
- `POST /documents/generate`
- `PUT /documents/:id` (transforming edited content)
- `GET /documents/:id` (context-aware HTML rendering)

---

### 🗄️ Backend Engineer
Responsible for:
- Building Supabase schema for accounts, documents, orgs
- Securing and versioning API endpoints
- Handling file storage and uploads
- Export service (HTML → DOCX/PDF via server)

APIs they own:
- `GET /accounts`, `GET /accounts/:id`
- `POST /accounts/:id/upload`
- `POST /documents/:id/export`

---

## 🧪 API Contract for Mocking (MSW)

Cursor should mock these endpoints during development:

```
GET    /accounts
GET    /accounts/:id
POST   /accounts/:id/upload
POST   /documents/generate
GET    /documents/:id
PUT    /documents/:id
POST   /documents/:id/export
```

Return fake but realistic JSON to simulate behavior.

---

## 🚫 MVP Exclusions

Cursor should **not** attempt to:
- Implement live multi-user editing
- Connect to a real database or Salesforce instance
- Design prompt structures for the AI agent
- Handle DOCX file parsing or generation directly
- Add analytics, settings, or organization management

---

## 🎯 Goal Reminder

> Cursor’s job is to create a polished, production-quality frontend that **feels real**, even if everything is mocked. It must enable a seamless demo where the user:
1. Logs in
2. Views accounts
3. Uploads context
4. Generates & edits a doc
5. Finalizes and exports it

The rest of the system is handled by backend and AI engineers.
