# LangGraph Agent Server

## Quick Start

To run the agent server from the root directory:

**macOS/Linux:**
```bash
./run_agent_server.sh
```

**Windows:**
```cmd
run_agent_server.bat
```

This will:
1. Verify Python 3.8+ is installed
2. Set up the Python virtual environment 
3. Install all dependencies
4. Configure environment variables
5. Start the server on http://localhost:8123

## Requirements

### System Requirements
- **Python 3.8 or higher** (the script will check this)
- **Python venv module** (usually included, but on some Linux systems needs separate installation)
  - Ubuntu/Debian: `sudo apt-get install python3-venv`
  - RHEL/CentOS: `sudo yum install python3-venv`

### Environment Variables
Create a `.env` file in the root directory with:

```env
# Required
OPENAI_API_KEY=your-openai-api-key
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Optional
OPENAI_MODEL=gpt-4o-mini  # default: gpt-4o-mini
```

## What It Does

The improved script now:
- **Validates environment** before running (Python version, dependencies, etc.)
- **Handles errors gracefully** with clear messages
- **Works on fresh computers** without assumptions
- **Safely loads environment variables** without security risks
- **Manages paths correctly** to prevent import errors
- **Provides clear troubleshooting guidance** when things go wrong

## Troubleshooting

### Common Issues

1. **"Python 3 is not installed"**
   - Install Python 3.8+ from [python.org](https://python.org)
   - Make sure it's in your PATH

2. **"Python venv module is not installed"**
   - See system requirements above for installation commands

3. **"No .env file found"**
   - Create `.env` file in the project root (not in the agent folder)
   - Copy from `.env.example` if available

4. **"Missing required environment variables"**
   - Check your .env file has all required keys
   - Make sure there are no extra spaces around the `=` sign

5. **Import errors when running**
   - Make sure you're running the script from the project root
   - Don't run `python agent/local_server.py` directly

## Stopping the Server

Press `Ctrl+C` to stop the server gracefully.

## Development

The agent uses an enhanced prompt system with specialized personas:
- **Research Specialist** for document retrieval
- **Business Analyst** for requirements analysis
- **Solutions Architect** for document planning
- **Specialized Writers** for different sections
- **QA Director** for validation

All imports are relative to the agent directory, managed automatically by PYTHONPATH.

## Manual Setup (Advanced)

If you prefer to set up manually:

```bash
cd agent
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
export PYTHONPATH="${PWD}:${PYTHONPATH}"
python -m local_server
```