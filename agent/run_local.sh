#!/bin/bash

# Run the LangGraph agent locally for development

echo "🚀 Starting LangGraph Agent Local Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  Warning: .env file not found in agent directory!"
    echo "📝 Creating .env from parent directory..."
    
    # Copy from parent .env if it exists
    if [ -f "../.env" ]; then
        cp ../.env .env
        echo "✅ Copied .env from parent directory"
    else
        echo "❌ No .env file found. Please create one with:"
        echo "   OPENAI_API_KEY=your-key"
        echo "   SUPABASE_URL=your-url"
        echo "   SUPABASE_SERVICE_KEY=your-service-key"
        exit 1
    fi
fi

# Run the local server
echo "🌐 Starting server on http://localhost:8123"
echo "📡 Vite will proxy requests to this server"
echo ""
python local_server.py