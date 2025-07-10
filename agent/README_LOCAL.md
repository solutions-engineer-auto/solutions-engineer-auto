# Running LangGraph Agent Locally

This guide explains how to run the LangGraph agent locally for development with Vite.

## Setup

### 1. Install Python Dependencies

First, make sure you have Python 3.11+ installed. Then install the dependencies:

```bash
cd agent
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the `agent` directory with your credentials:

```bash
# Copy from parent directory if it exists
cp ../.env .env

# Or create new with required variables:
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key
```

### 3. Update Vite Environment

In your root `.env` file, add or update:

```bash
# Enable local mode
VITE_LANGGRAPH_MODE=local
VITE_LANGGRAPH_LOCAL_URL=http://localhost:8123
```

## Running the Agent

### Option 1: Using the Script (Recommended)

```bash
cd agent
./run_local.sh
```

This script will:
- Create a virtual environment
- Install dependencies
- Check for .env file
- Start the local server on port 8123

### Option 2: Manual Start

```bash
cd agent
python local_server.py
```

## Running Vite

In a separate terminal, start your Vite dev server:

```bash
npm run dev
```

Vite will automatically proxy LangGraph requests to your local agent server.

## How It Works

1. **Local Server**: The `local_server.py` runs a FastAPI server that mimics the LangGraph Cloud API
2. **Vite Proxy**: When `VITE_LANGGRAPH_MODE=local`, Vite proxies requests to `http://localhost:8123`
3. **Agent**: Your existing Python agent runs locally with full access to logs and debugging

## API Endpoints

The local server provides:

- `GET /health` - Health check
- `POST /runs/stream` - Main agent endpoint (SSE streaming)
- `POST /feedback` - Feedback logging

## Debugging

- **Agent Logs**: Check the terminal running `run_local.sh`
- **Vite Logs**: Check the terminal running `npm run dev`
- **Network**: Use browser DevTools to inspect API calls

## Switching Between Local and Cloud

To switch back to LangGraph Cloud:

1. Update `.env`:
   ```bash
   # Comment out or remove
   # VITE_LANGGRAPH_MODE=local
   ```

2. Restart Vite dev server

## Troubleshooting

### Port Already in Use

If port 8123 is taken, change it in:
- `agent/.env`: Add `LANGGRAPH_LOCAL_PORT=8124`
- Root `.env`: Update `VITE_LANGGRAPH_LOCAL_URL=http://localhost:8124`

### Missing Dependencies

```bash
cd agent
pip install -r requirements.txt
```

### Environment Variables Not Found

Make sure `.env` exists in both:
- Root directory (for Vite)
- `agent/` directory (for Python)

### CORS Issues

The local server includes CORS headers for `localhost:5173`. If using a different port, update `local_server.py`.