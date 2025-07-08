# Solutions Engineer Automation Tool

An AI-powered document generation platform that helps Solutions Engineers create integration proposals and technical documentation 90% faster.

## Overview

This MVP demonstrates how AI agents can streamline the document creation process for Solutions Engineers while maintaining quality through human review and editing capabilities. The application features a React frontend with a LangGraph Cloud AI agent backend.

### Key Features

- **AI-Powered Document Generation** - Generate complete integration documents using AI agents
- **Rich Text Editor** - Full-featured document editing with TipTap
- **Multi-Format Export** - Export documents as Word (DOCX), PDF, or Markdown
- **Account Management** - Track prospects and their document status
- **Iterative Refinement** - Send feedback to refine AI-generated content
- **Real-time Activity Tracking** - See what the AI agent is doing in real-time

## Prerequisites

- Node.js 18+ and npm
- Modern web browser (Chrome, Firefox, Safari, Edge)
- LangGraph Cloud deployment (optional - can use mock mode)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd solutions-engineer-auto
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your LangGraph API credentials:
   ```env
   VITE_LANGGRAPH_API_URL=https://your-deployment.us.langgraph.app
   VITE_LANGGRAPH_API_KEY=your-api-key-here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   
   Navigate to http://localhost:5173 in your browser

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_LANGGRAPH_API_URL` | Your LangGraph Cloud deployment URL | Yes (for agent mode) |
| `VITE_LANGGRAPH_API_KEY` | Your LangGraph Cloud API key | Yes (for agent mode) |
| `VITE_SUPABASE_URL` | Supabase project URL | No (future use) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | No (future use) |

## Features

### Document Generation Modes

1. **Mock Mode** (Default)
   - Uses pre-configured mock data
   - No external dependencies required
   - Great for UI development and testing

2. **Agent Mode** 
   - Connects to your LangGraph Cloud deployment
   - Real AI-powered document generation
   - Requires LangGraph API credentials

### Workflow

1. **Login** - Use any email/password (mock authentication)
2. **Select Account** - Choose from the list of prospects
3. **Generate Document** - Click to create a new document or open existing
4. **Edit & Refine** - Use the rich text editor or send feedback to the AI
5. **Export** - Download in your preferred format

### Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS
- **Editor**: TipTap (rich text editor)
- **State**: Zustand
- **Routing**: React Router v7
- **Export**: docx, html2pdf.js, turndown
- **Mocking**: MSW (Mock Service Worker)
- **AI Integration**: LangGraph SDK

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## License

This is a technical demonstration project.

---

Built for Solutions Engineers