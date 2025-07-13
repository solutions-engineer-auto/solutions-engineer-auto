# Maxwell - AI Writing Assistant for Solutions Engineers

An intelligent writing assistant that helps Solutions Engineers create integration proposals, technical documentation, and sales materials 90% faster.

## Overview

Maxwell is an AI writing assistant designed specifically for Solutions Engineers. It understands the technical and business context of enterprise software sales, helping you write compelling proposals, detailed technical documentation, and persuasive sales materials. Maxwell features a React frontend with a LangGraph Cloud AI agent backend that acts as your writing partner throughout the sales cycle.

### Key Features

- **AI Writing Partner** - Get intelligent help writing 20+ types of technical and sales documents
- **Context-Aware Assistant** - Maxwell understands your prospect's industry, stage, and technical requirements
- **Smart Text Refinement** - Select any text and press Cmd/Ctrl+K for instant AI-powered improvements
- **Voice Dictation** - Speak your ideas and let Maxwell help you structure them (Ctrl+.)
- **Rich Text Editor** - Professional document editing with diagrams, formatting, and real-time collaboration
- **Intelligent Suggestions** - Get writing suggestions that match your tone and technical accuracy
- **Knowledge Memory** - Maxwell remembers your previous documents to maintain consistency
- **Multi-Format Export** - Deliver polished documents as Word (DOCX), PDF, or Markdown
- **Prompt Optimization Lab** - Fine-tune Maxwell's writing style for your specific needs
- **Change Tracking** - Review all AI suggestions before accepting them into your document
- **Template Library** - Start from proven templates for common SE scenarios
- **Global Knowledge Base** - Leverage successful content from across your organization

## Prerequisites

- Node.js 18+ and npm
- Python 3.8+ (for agent development)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account (for document storage)
- LangGraph Cloud account (for AI agent deployment)
- OpenAI API key (for document generation)
- Windows, macOS, or Linux operating system

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
   cp .env.example .env
   ```

   Edit `.env` and add your credentials. See the [Environment Variables](#environment-variables) section for details.

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open the application**

   Navigate to http://localhost:5173 in your browser

## LangGraph Agent Setup

### Option 1: Local Development

You can run the LangGraph agent locally for development and testing:

1. **Set up environment variables**
   Create `.env` file in the root directory with your agent credentials:
   ```env
   OPENAI_API_KEY=your-openai-api-key
   OPENAI_MODEL=gpt-4o-mini  # Optional, defaults to gpt-4o-mini
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-supabase-service-key  # Service key for bypassing RLS
   ```

2. **Start the local agent server**

   On macOS/Linux:
   ```bash
   ./run_agent_server.sh
   ```

   On Windows:
   ```cmd
   run_agent_server.bat
   ```

   This script automatically:
   - Creates a Python virtual environment
   - Installs all required dependencies
   - Validates your environment configuration
   - Starts the server on http://localhost:8123

3. **Configure frontend for local mode**
   Update your `.env`:
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
   Once deployed, update your `.env` with the deployment URL and API key:
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
   Add your Supabase credentials to `.env`


## Environment Variables

All environment variables are configured in a single `.env` file in the root directory. Copy `.env.example` to `.env` to get started.

### Frontend Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |
| `VITE_LANGGRAPH_API_URL` | Your LangGraph Cloud deployment URL | Yes (for cloud mode) |
| `VITE_LANGGRAPH_API_KEY` | Your LangGraph Cloud API key | Yes (for cloud mode) |
| `VITE_LANGGRAPH_MODE` | Set to "local" for local agent development | No |
| `VITE_LANGGRAPH_LOCAL_URL` | Local agent server URL (default: http://localhost:8123) | No |

### Agent/Backend Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM calls | Yes | - |
| `OPENAI_MODEL` | Model to use (e.g., gpt-4o-mini, gpt-4, gpt-3.5-turbo) | No | gpt-4o-mini |
| `SUPABASE_URL` | Supabase project URL (same as VITE_SUPABASE_URL) | Yes | - |
| `SUPABASE_SERVICE_KEY` | Supabase service key (bypasses RLS) | Yes | - |

## Features

### AI Writing Assistant

Maxwell works alongside you as an intelligent writing partner:

- **Natural Language Requests** - Ask Maxwell to write any type of document in plain English
- **Context Understanding** - Maxwell knows your prospect's details and writes accordingly
- **Instant Draft Creation** - Get a complete first draft in seconds, then refine together
- **Voice-First Input** - Speak your ideas naturally with Ctrl+. for voice dictation
- **Collaborative Refinement** - Chat with Maxwell to improve specific sections

To work with Maxwell:
1. Click the "AI Assistant" button in the document editor
2. Describe what you need to write (e.g., "Write a technical proposal for Blue Corp's API integration")
3. Maxwell creates a complete draft based on your requirements
4. Continue chatting to refine sections or make specific changes

### Knowledge Graph

Visualize document relationships and connections:

- **Interactive Graph** - Click and drag nodes to explore relationships
- **Document Preview** - Click nodes to see document details
- **Global Knowledge View** - Toggle between account-specific and global knowledge
- **Real-time Updates** - Graph updates automatically as documents are added

### Prompt Optimization Lab

Optimize the prompts used in document generation:

- **Visual Workflow** - See all 6 document generation steps
- **Prompt Editing** - Edit prompts with variable highlighting
- **Test with Sample Data** - Test prompts before applying
- **Automatic Optimization** - Generate optimized prompt variants
- **Quality Scoring** - Compare variants with quality metrics

Access from the Account Dashboard via the "Optimization Lab" button.

### Smart Text Refinement

Improve any part of your document with intelligent suggestions:

- **Instant Rewrites** - Select text and press Cmd/Ctrl+K for better alternatives
- **Context-Aware Edits** - Maxwell understands the surrounding content for coherent suggestions
- **Style Matching** - Maintains your document's tone and technical level
- **Full Control** - Preview and choose which suggestions to accept

### Voice Input

Use voice commands for faster input:

- **Global Shortcut** - Press Ctrl+. anywhere in the app
- **Auto-transcription** - Real-time speech-to-text
- **AI Chat Integration** - Voice input directly to AI assistant

### Document Types

The AI agent can generate 20+ different document types:

- **Sales Documents** - Proposals, SOWs, Business Cases
- **Technical Documents** - Architecture docs, Security questionnaires, API docs
- **Discovery Documents** - Requirements gathering, Technical assessments
- **Implementation Documents** - Project plans, Training materials, Runbooks
- **Support Documents** - Troubleshooting guides, FAQs, Knowledge base articles

### Workflow

1. **Login** - Use any email/password (mock authentication)
2. **Select Account** - Choose from the list of prospects
3. **Generate Document** - Use AI chat or click "Generate with AI"
4. **Edit & Refine** - Use the rich text editor with AI assistance
5. **Collaborate** - Share via global knowledge base
6. **Export** - Download in your preferred format (DOCX, PDF, Markdown)


## Contributors

- **[@bishibop](https://github.com/bishibop)** - LangGraph agent implementation and Prompt Optimization Lab
- **[@britishamerican](https://github.com/britishamerican)** - Editor UI, diff system, and Knowledge Graph visualization  
- **[@matt0089](https://github.com/matt0089)** - Backend infrastructure, voice features, and document processing

## License

MIT License

Copyright (c) 2025 Solutions Engineer Auto Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---