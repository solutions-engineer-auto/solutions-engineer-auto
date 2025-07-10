# Solutions Engineer Automation Tool

An AI-powered document generation platform that helps Solutions Engineers create integration proposals and technical documentation 90% faster.

## Overview

This MVP demonstrates how AI agents can streamline the document creation process for Solutions Engineers while maintaining quality through human review and editing capabilities. The application features a React frontend with a LangGraph Cloud AI agent backend.

### Key Features

- **AI-Powered Document Generation** - Generate complete integration documents using AI agents
- **AI Chat Assistant** - Interactive chat panel with automatic document replacement
- **Rich Text Editor** - Full-featured document editing with TipTap
- **Multi-Format Export** - Export documents as Word (DOCX), PDF, or Markdown
- **Account Management** - Track prospects and their document status
- **Document Storage** - Persist documents with Supabase backend
- **Real-time Activity Tracking** - See what the AI agent is doing in real-time

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for agent development)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account (for document storage)
- LangGraph Cloud account (for AI agent deployment)
- OpenAI API key (for document generation)

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
   
   Edit `.env.local` and add your credentials:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   
   # LangGraph Cloud Configuration
   VITE_LANGGRAPH_API_URL=https://your-deployment.us.langgraph.app
   VITE_LANGGRAPH_API_KEY=your-api-key-here
   VITE_SUPABASE_URL=your-supabase-url 
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**
   
   Navigate to http://localhost:5173 in your browser

## LangGraph Agent Setup

### Option 1: Local Development (Recommended for testing)

You can run the LangGraph agent locally for development and testing:

1. **Install Python dependencies**
   ```bash
   cd agent
   pip install -r requirements.txt
   ```

2. **Set up agent environment**
   Create `.env` file in the `agent/` directory:
   ```env
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-supabase-service-key  # Service key for bypassing RLS
   ```

3. **Start the local agent server**
   ```bash
   cd agent
   ./run_local.sh
   ```

   The agent will start on http://localhost:8123

4. **Configure frontend for local mode**
   Update your `.env.local`:
   ```env
   VITE_LANGGRAPH_MODE=local
   VITE_LANGGRAPH_LOCAL_URL=http://localhost:8123
   ```

### Option 2: LangGraph Cloud Deployment

For production use, deploy the agent to LangGraph Cloud:

1. **Deploy to LangGraph Cloud**
   Follow the [LangGraph Cloud deployment guide](https://docs.langchain.com/docs/cloud/deployment) to deploy the agent.
   
   The agent file to deploy is `agent/agent.py`

2. **Update frontend configuration**
   Once deployed, update your `.env.local` with the deployment URL and API key:
   ```env
   VITE_LANGGRAPH_API_URL=https://your-deployment.us.langgraph.app
   VITE_LANGGRAPH_API_KEY=your-api-key-here
   ```

## Supabase Setup

1. **Create a Supabase project**
   - Go to [supabase.com](https://supabase.com) and create a new project
   - Note your project URL and anon key

2. **Set up the database**
   - The application will create necessary tables automatically
   - Documents are stored with account associations

3. **Update environment variables**
   Add your Supabase credentials to `.env.local`

## Environment Variables

### Frontend (.env.local)

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_LANGGRAPH_API_URL` | Your LangGraph Cloud deployment URL | Yes (for cloud mode) |
| `VITE_LANGGRAPH_API_KEY` | Your LangGraph Cloud API key | Yes (for cloud mode) |
| `VITE_LANGGRAPH_MODE` | Set to "local" for local agent development | No |
| `VITE_LANGGRAPH_LOCAL_URL` | Local agent server URL (default: http://localhost:8123) | No |

### Agent (agent/.env)

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for LLM calls | Yes |
| `OPENAI_MODEL` | Model to use (e.g., gpt-4, gpt-3.5-turbo) | No |
| `SUPABASE_URL` | Supabase project URL | Yes |
| `SUPABASE_SERVICE_KEY` | Supabase service key (bypasses RLS) | Yes |

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

### AI Chat Assistant

The application includes an AI chat panel that provides:

- **Interactive Document Generation** - Ask the AI to create specific types of documents
- **Automatic Document Replacement** - Generated documents automatically replace the editor content
- **Mock Mode** - Test the UI with simulated responses
- **Agent Mode** - Connect to your LangGraph deployment for real AI generation

To use the AI chat:
1. Click the "AI Assistant" button in the document editor
2. Type your request (e.g., "Generate a blue discovery document")
3. The AI will generate the document and automatically load it in the editor
4. The chat shows a clean "Document Generated" message instead of the full content

### Workflow

1. **Login** - Use any email/password (mock authentication)
2. **Select Account** - Choose from the list of prospects
3. **Generate Document** - Use AI chat or click "Generate with AI"
4. **Edit & Refine** - Use the rich text editor
5. **Export** - Download in your preferred format

### Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS
- **Editor**: TipTap (rich text editor)
- **State**: Zustand
- **Routing**: React Router v7
- **Database**: Supabase (PostgreSQL)
- **Export**: docx, html2pdf.js, turndown
- **Mocking**: MSW (Mock Service Worker)
- **AI Integration**: LangGraph SDK
- **Agent**: Python, LangGraph, LangChain, OpenAI

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
