#!/bin/bash
set -euo pipefail

# Run the LangGraph agent server from the root directory
# This script handles all the setup and path management

echo "🚀 Starting LangGraph Agent Server..."
echo "=================================================="

# Check if we're in the correct directory
if [ ! -d "agent" ]; then
    echo "❌ Error: 'agent' directory not found."
    echo "   Please run this script from the project root directory."
    exit 1
fi

# Check for Python 3
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed."
    echo "   Please install Python 3.8 or higher."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
REQUIRED_VERSION="3.8"
if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "❌ Error: Python $PYTHON_VERSION is too old. Requires Python $REQUIRED_VERSION or higher."
    exit 1
fi

# Check for venv module
if ! python3 -m venv --help &> /dev/null; then
    echo "❌ Error: Python venv module is not installed."
    echo "   On Ubuntu/Debian: sudo apt-get install python3-venv"
    echo "   On RHEL/CentOS: sudo yum install python3-venv"
    exit 1
fi

# Change to agent directory
cd agent

# Check for requirements.txt
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found in agent directory."
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv || {
        echo "❌ Error: Failed to create virtual environment."
        exit 1
    }
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate || {
        echo "❌ Error: Failed to activate virtual environment."
        exit 1
    }
else
    echo "❌ Error: Virtual environment activation script not found."
    exit 1
fi

# Upgrade pip first to avoid issues
echo "🔄 Upgrading pip..."
python3 -m pip install --upgrade pip &> /dev/null || {
    echo "⚠️  Warning: Failed to upgrade pip, continuing anyway..."
}

# Install/update dependencies
echo "📥 Installing dependencies..."
python3 -m pip install -r requirements.txt || {
    echo "❌ Error: Failed to install dependencies."
    echo "   Check the error messages above for details."
    exit 1
}

# Function to safely load .env file
load_env_file() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        echo "📝 Loading environment from: $env_file"
        set -a
        source "$env_file"
        set +a
        return 0
    fi
    return 1
}

# Check for .env file
ENV_LOADED=false

# Try agent directory first
if load_env_file ".env"; then
    ENV_LOADED=true
# Try root directory
elif load_env_file "../.env"; then
    ENV_LOADED=true
fi

if [ "$ENV_LOADED" = false ]; then
    echo "❌ Error: No .env file found."
    echo "   Please create a .env file in the root directory with:"
    echo "   OPENAI_API_KEY=your-key"
    echo "   SUPABASE_URL=your-url"
    echo "   SUPABASE_SERVICE_KEY=your-service-key"
    echo ""
    echo "   Optional:"
    echo "   OPENAI_MODEL=gpt-4o-mini  (default: gpt-4o-mini)"
    exit 1
fi

# Verify required environment variables
MISSING_VARS=()
[ -z "${OPENAI_API_KEY:-}" ] && MISSING_VARS+=("OPENAI_API_KEY")
[ -z "${SUPABASE_URL:-}" ] && MISSING_VARS+=("SUPABASE_URL")
[ -z "${SUPABASE_SERVICE_KEY:-}" ] && MISSING_VARS+=("SUPABASE_SERVICE_KEY")

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ Error: Missing required environment variables:"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
    exit 1
fi

# Set PYTHONPATH to include the agent directory
export PYTHONPATH="${PWD}${PYTHONPATH:+:${PYTHONPATH}}"

# Check if local_server module exists
if [ ! -f "local_server.py" ]; then
    echo "❌ Error: local_server.py not found in agent directory."
    exit 1
fi

# Run the local server
echo ""
echo "🌐 Starting server on http://localhost:8123"
echo "📡 Frontend can proxy requests to this server"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="
echo ""

# Run with python3 -m to ensure proper module resolution
# Using exec to replace the shell process, ensuring clean shutdown
exec python3 -m local_server