#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting Maxwell - AI Writing Assistant${NC}"
echo "================================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please copy .env.example to .env and configure your credentials."
    exit 1
fi

# Function to kill all child processes on exit
cleanup() {
    echo -e "\n${BLUE}Shutting down...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

# Set up trap to clean up on exit
trap cleanup EXIT INT TERM

# Start the agent server in background
echo -e "\n${GREEN}Starting LangGraph Agent Server...${NC}"
./run_agent_server.sh &
AGENT_PID=$!

# Wait a bit for agent server to start
echo -e "${BLUE}Waiting for agent server to initialize...${NC}"
sleep 5

# Check if agent server is running
if ! kill -0 $AGENT_PID 2>/dev/null; then
    echo -e "${RED}Agent server failed to start!${NC}"
    exit 1
fi

# Start the frontend dev server
echo -e "\n${GREEN}Starting Frontend Development Server...${NC}"
npm run dev &
FRONTEND_PID=$!

# Wait a moment then show URLs
sleep 3
echo -e "\n${GREEN}✅ Maxwell is running!${NC}"
echo "================================================"
echo -e "${YELLOW}🌐 Open your browser and go to:${NC}"
echo -e "   ${GREEN}➜${NC} ${BLUE}http://localhost:5173${NC}"
echo ""
echo -e "${YELLOW}Backend services:${NC}"
echo -e "   Agent Server: ${BLUE}http://localhost:8123${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop all services"
echo "================================================"

# Wait for any background job to exit
wait