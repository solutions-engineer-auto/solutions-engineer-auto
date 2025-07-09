Solution Engineer Automation Tool MVP

**Product Name:** Solution Engineer Automation Tool **Version:** MVP (July 8 Demo) **Last Updated:** July 7, 2025

---

### **Objective**

Build an agentic AI system to help Solutions Engineers rapidly generate, edit, and export integration-related documents from Salesforce data and internal templates. The system should demonstrate how AI can reduce document generation time by 90% while maintaining a human-in-the-loop review process.

---

### **Key Features**

#### 1. **User Authentication and Access**

- OAuth login for Solutions Engineers.
- Users are shown a list of their active accounts or projects (mocked or pulled from Salesforce).

#### 2. **Prospect View UI**

- After login, the user sees a list of accounts.
- Clicking an account reveals:
  - Current sales stage (mocked via prospect summary document).
  - In-progress document (single for MVP).
  - Agent-suggested document based on stage.

#### 3. **Document Generation Agent**

- Accepts context from uploaded documents and internal templates.
- Capable of:
  - Suggesting new document based on sales stage.
  - Accepting user prompt or instruction ("Generate integration plan").
  - Returning an HTML-formatted document with company style/structure.
  - Operates as a single agent for MVP, with plans to scale to parallel agents.

#### 4. **Human-in-the-loop Editing**

- HTML editor (e.g., TipTap or ProseMirror).
- Edits trigger re-generation prompts (highlight + command-k style UX).
- Document is saved only when finalized.
- Reverts to last save if the user discards changes.

#### 5. **Document Upload + Mocked Data Input**

- Drag-and-drop file upload (PDF, DOCX, TXT) for prospect context.
- Uploaded files simulate Salesforce CRM records for MVP.
- Generates internal "prospect summary" used by the agent.
- Future: ingest from real Salesforce accounts into Postgres.

#### 6. **Exporting**

- Finalized documents exported to:
  - DOCX (industry standard)
  - PDF (via HTML-to-docx pipeline like `html-docx-js`)

---

### **Technical Architecture**

**Frontend:**

- React (with HTML editor integration)
- Tailwind CSS for UI styling
- Drag-and-drop file interface

**Backend:**

- Supabase (Postgres)
- Optional Redis later (for agent memory/caching)
- Future vector database support for RAG-style context management (e.g., Weaviate, Supabase Vector, or Pinecone)

**API Endpoints:**

- `POST /auth/login` – OAuth entry
- `GET /accounts` – List available accounts
- `GET /accounts/:id` – Prospect summary + document status
- `POST /accounts` – Create new prospect
- `POST /accounts/:id/upload` – Upload file for context
- `GET /templates` – List templates by stage/type
- `GET /templates/:id` – Fetch specific template
- `POST /documents/generate` – Trigger agent generation
- `GET /documents/:id` – Load document for editing
- `PUT /documents/:id` – Save finalized document
- `POST /documents/:id/export` – Generate PDF/DOCX

**AI Agent:**

- Single-agent architecture (MVP)
- Context sources:
  - Uploaded docs
  - Internal templates
  - Prospect summary (stored in Postgres)
- Future: document style guides, internal RAG store, and multi-agent workflows
- Agent manages its own internal context

**Context Memory Model:**

```json
{
  "account_id": "...",
  "context_summary": "...",
  "uploaded_files": [...],
  "agent_notes": [...],
  "style_guide_id": "..."
}
```

- This will support future multi-document summaries, chat history, and external file ingestion.
- Storage in Postgres for MVP; vector database integration in later phases.

**Organization Settings Model:**

```json
{
  "organization_id": "...",
  "default_export_format": "docx",
  "preferred_language_tone": "formal",
  "style_guide_id": "...",
  "template_preferences": [...]
}
```

- Enables per-org configuration and branding.
- Settings to be applied automatically to new account/document generation.

---

### **Document Types (Initial)**

| Stage            | Document Types                                |
| ---------------- | --------------------------------------------- |
| Discovery        | Prospect Summary, Technical Fit Overview      |
| Pre-Sales        | Integration Feasibility Brief, Risk Checklist |
| Pilot Deployment | System Architecture Plan, Timeline Draft      |
| Post-Sale        | Final Integration Plan, Internal SOP          |

---

### **Document State Lifecycle**

| State              | Description                                      |
| ------------------ | ------------------------------------------------ |
| `draft`            | Initial generation or in-progress editing        |
| `ready_for_review` | User intends for final check before publishing   |
| `finalized`        | Document is exported and/or pushed to Salesforce |

---

### **MVP Exclusions**

- Multi-user collaboration / live editing
- Resume/edit saved document states
- Versioning or history
- Rich DOCX preview before export
- Salesforce write-back
- Multi-document generation per account (future)

---

### **Demo Script (5–7 minutes)**

1. Log in with OAuth.
2. Drag-and-drop file upload.
3. Show accounts list and mock sales stages.
4. Select account → show summary + suggested doc.
5. Click "Generate" → show generated HTML doc.
6. Edit doc (TipTap or ProseMirror).
7. Export as PDF or DOCX.
8. (Optional: show agent architecture/log trace)

---

### **Open Questions / Risks**

- DOCX formatting fidelity from HTML
- Prompt design for document structure and context
- Agent performance on minimal input
- Scaling memory/context across many accounts and files
- Support for varied input formats (PDF, DOCX, TXT)

---

### **Stretch Goals (if time permits)**

- Salesforce read integration (OAuth)
- Agent logs and traceability
- Parallel agent routing (multi-agent workflows)
- PDF preview before export
- Style guide ingestion (per-org)
- Butterfly architecture for file movement/format unification
- Context-aware version comparison and diffing

---

### **Team Reminders**

- Keep MVP simple: 1 document per account, 1 agent
- Save only when finalized
- Use HTML for editing, DOCX for output
- Focus on visual, working demo (get the budget on screen)
- Drag-and-drop simulates CRM input
- Working as a 3-person team: assign clear ownership per component
- Demo is solo-user only: no live collaboration

---

**Prepared by:** ChatGPT (based on notes from Granola tool; no team name assigned)

