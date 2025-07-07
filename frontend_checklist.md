
# ✅ Frontend Development Checklist — Solution Engineer Automation Tool

> This checklist is milestone-based and designed to help Cursor execute each task autonomously and accurately, with high reliability and minimal bugs. Each milestone builds upon the previous one and includes guidance to reduce ambiguity.

---

## 🛠️ MILESTONE 1: Project Initialization

- [ ] Initialize Vite React project (`npm create vite@latest`)
- [ ] Set up Git repository (`git init`, `git commit`)
- [ ] Install TailwindCSS (`npm install -D tailwindcss postcss autoprefixer`)
- [ ] Configure Tailwind (`tailwind.config.js`, `index.css`)
- [ ] Install MSW (`npm install msw --save-dev`) and initialize `public/mockServiceWorker.js`
- [ ] Create folder structure:
  ```
  /src
    /components
    /pages
    /mocks
    /styles
    /utils
  ```

---

## 🔐 MILESTONE 2: Auth Flow (Mocked)

- [ ] Create `/login` route and `LoginPage` component
- [ ] Display "Login as Demo Engineer" button
- [ ] On click, store `userId` in `localStorage`
- [ ] Redirect to `/accounts` after login
- [ ] Implement `RequireAuth` route guard (basic protected routes)

---

## 🧾 MILESTONE 3: Account Dashboard

- [ ] Create `AccountDashboard` page at `/accounts`
- [ ] Fetch accounts from `GET /accounts` (mocked via MSW)
- [ ] Render each account in a card with:
  - Account name
  - Sales stage
  - Document status badge
- [ ] Add filter by stage (optional)
- [ ] On card click, route to `/accounts/:id`

---

## 📁 MILESTONE 4: Prospect Detail View

- [ ] Create `ProspectDetailPage` at `/accounts/:id`
- [ ] Fetch account info from `GET /accounts/:id`
- [ ] Display:
  - Summary card (account name, stage)
  - Current document state
  - "Generate Suggested Document" button
- [ ] Setup mock for `POST /accounts/:id/upload`

---

## 📂 MILESTONE 5: File Upload Interface

- [ ] Create `FileUploadDropzone` component
- [ ] Use `react-dropzone` or native drag-and-drop API
- [ ] Accept PDF, DOCX, TXT only
- [ ] Show file name and type on drop
- [ ] POST to `/accounts/:id/upload` and show success message

---

## ✍️ MILESTONE 6: AI Document Generation

- [ ] When "Generate Suggested Document" is clicked:
  - Call `POST /documents/generate`
  - Store returned document ID
  - Redirect to `/accounts/:id/documents/:docId`
- [ ] Create `DocumentEditorPage`
- [ ] Fetch generated doc from `GET /documents/:id`

---

## 🧠 MILESTONE 7: TipTap Editor Integration

- [ ] Install TipTap: `@tiptap/react`, `@tiptap/starter-kit`
- [ ] Implement TipTap editor with basic formatting toolbar
- [ ] Bind editor content to document state
- [ ] Detect unsaved changes
- [ ] Disable editing if document is finalized

---

## 💾 MILESTONE 8: Save + Document State Transitions

- [ ] Add "Save Changes" button → calls `PUT /documents/:id`
- [ ] Add state badge (`draft`, `review`, `finalized`)
- [ ] Add "Finalize Document" button:
  - Confirms user intent
  - Locks editor
  - Sets state to `finalized`

---

## 📤 MILESTONE 9: Export System

- [ ] Create `ExportModal` component with PDF/DOCX selection
- [ ] Disable if not finalized
- [ ] Call `POST /documents/:id/export`
- [ ] Show download link after generation

---

## 🔁 MILESTONE 10: Global Layout & Routing

- [ ] Use React Router
- [ ] Define all main routes:
  - `/login`
  - `/accounts`
  - `/accounts/:id`
  - `/accounts/:id/documents/:docId`
- [ ] Create `Layout` component with nav (optional)
- [ ] Wrap routes in `<AuthProvider>` if using state store

---

## 🧪 MILESTONE 11: Mocking with MSW

- [ ] Define handlers for:
  - `GET /accounts`
  - `GET /accounts/:id`
  - `POST /accounts/:id/upload`
  - `POST /documents/generate`
  - `GET /documents/:id`
  - `PUT /documents/:id`
  - `POST /documents/:id/export`
- [ ] Add artificial delay to simulate network latency
- [ ] Add example mock data in `mockData.ts`

---

## 🎨 MILESTONE 12: Styling & Finishing Touches

- [ ] Apply Tailwind to all components for layout and responsiveness
- [ ] Use consistent spacing, rounded cards, badges
- [ ] Add loading spinners for all async operations
- [ ] Mobile-responsiveness check
- [ ] Polish buttons, inputs, and tooltips

---

## 🧠 MILESTONE 13: Final Demo Prep

- [ ] Ensure one full user flow works:
  1. Login → select account
  2. Upload file
  3. Generate doc
  4. Edit and finalize
  5. Export PDF/DOCX
- [ ] Validate MSW works without backend
- [ ] Clean up unused code
- [ ] Commit everything with clear messages
