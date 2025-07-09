
# 🧭 Frontend Feature Guide — Solution Engineer Automation Tool

> This document defines the exact frontend scope, broken into atomic feature modules, UI states, and responsibilities. Cursor should treat this as the canonical roadmap for the user-facing experience.

---

## 🔐 1. Authentication Layer

### 📌 Feature: OAuth Login Screen (Mocked)
- **Goal**: Simulate engineer login to gate access
- **UI**: Minimal login screen with single "Login as Demo Engineer" button
- **State**: Store `userId` in `localStorage` or `Zustand` for now
- **Later**: Wire up real Supabase OAuth if needed

---

## 📁 2. Account Dashboard

### 📌 Feature: Prospect Account List
- **Goal**: View all active prospect accounts
- **UI**:
  - Card or table format
  - Show account name, stage, doc status (`draft`, `finalized`)
- **State**:
  - Fetched from `GET /accounts`
  - Filter/sort by sales stage
- **Interactions**:
  - Click to go to account detail view (`/accounts/:id`)

---

## 🧾 3. Account Detail Page

### 📌 Feature: Prospect Summary & Actions
- **Goal**: Show account's summary, current doc, and generation options
- **UI**:
  - Sales stage display (Discovery, Pre-Sales, etc.)
  - Upload box for Salesforce docs
  - "Generate Suggested Document" button
  - Doc state badge
- **Data**:
  - Fetched from `GET /accounts/:id`
  - Upload via `POST /accounts/:id/upload`

---

## 📂 4. File Upload System

### 📌 Feature: Drag-and-Drop Upload Interface
- **Goal**: Upload prospect-relevant PDFs/DOCX/TXT files
- **UI**:
  - Dropzone with visual feedback
  - File preview or filename shown on drop
- **State**:
  - Allow 1 file per upload (for MVP simplicity)
  - Parse filename/metadata client-side
- **API**:
  - `POST /accounts/:id/upload`

---

## 🧠 5. AI Document Generation Flow

### 📌 Feature: Trigger Document Generation
- **Goal**: Request AI to generate draft doc
- **UI**:
  - Button: "Generate Suggested Document"
  - Optional: modal to confirm or pick document type
  - Spinner/loading state
- **API**:
  - `POST /documents/generate`
  - `GET /documents/:id`

---

## ✍️ 6. HTML Document Editor

### 📌 Feature: TipTap WYSIWYG Editor
- **Goal**: Display editable AI-generated document
- **UI**:
  - Fullscreen editing mode
  - TipTap with formatting toolbar
  - Show doc state (draft, review, finalized)
  - Side-by-side preview + edit (optional)
- **Behavior**:
  - Text edits detected and tracked
  - Highlight + `Cmd-K` triggers AI regen (simulated for MVP)
- **State**:
  - Editable unless finalized
  - Track “dirty” state until saved
- **API**:
  - `GET /documents/:id` to load
  - `PUT /documents/:id` to save

---

## 📤 7. Export System

### 📌 Feature: Export to DOCX/PDF
- **Goal**: Let user finalize & export their doc
- **UI**:
  - Export button with format dropdown (PDF, DOCX)
  - Show loading, then download link
- **API**:
  - `POST /documents/:id/export`
- **Constraints**:
  - Disable export unless doc is finalized
  - Use html-docx-js on frontend or proxy to backend

---

## 🧾 8. Document Lifecycle State

### 📌 Feature: Document State Manager
- **Goal**: Represent and enforce state transitions (`draft` → `ready_for_review` → `finalized`)
- **UI**:
  - Badge display of current state
  - Button to "Finalize"
- **Behavior**:
  - Lock editing after `finalized`
  - Confirm before finalizing

---

## 🔀 9. Routing & Navigation

### 📌 Feature: Page Router
- **Structure**:
  ```
  /login
  /accounts
  /accounts/:id
  /accounts/:id/documents/:docId
  ```
- **Tool**: React Router

---

## 🧰 10. State & Mocking Layer

### 📌 Feature: Mocked Backend via MSW
- Use [MSW](https://mswjs.io/) to intercept REST calls
- Return mocked data for:
  - Accounts list
  - Account details
  - Generated document content
- Mock response delays to simulate agent time

### 📌 Feature: Client State Management
- Tool: `Zustand` or `React Context`
- Store:
  - Auth user ID
  - Selected account
  - Loaded document & state
  - Upload metadata (file name, type)

---

## 🎨 11. Styling & Layout

### 📌 Feature: Tailwind UI
- Global theme using Tailwind + shadcn/ui if needed
- Responsive grid layouts
- Clean and professional design (Salesforce-esque)

---

## ✅ Final Deliverable

A single-user React app with:
- Clean routing and modular layout
- MSW-powered mock data
- TipTap-based editor
- File upload + export flow
- Clear document lifecycle UX

---

## 🧠 Summary for Cursor

> The AI agent and backend team will handle generation, file parsing, and storage. Your job is to present a beautiful, structured interface that feels real — even if all APIs are mocked.
