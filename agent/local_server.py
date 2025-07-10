#!/usr/bin/env python3
"""
Local LangGraph Server
Runs the LangGraph agent locally for development with Vite
"""

import os
import json
import asyncio
import uuid
from datetime import datetime
from typing import Dict, Any

# Load environment variables FIRST before any other imports
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
from supabase import create_client, Client

# Import your existing agent (after env vars are loaded)
from agent import graph, AgentState

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# Create FastAPI app
app = FastAPI()

# Add CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "langgraph-local"}


@app.post("/threads")
async def create_thread():
    """Create a new thread (mimics LangGraph Cloud API)"""
    thread_id = f"thread-{uuid.uuid4().hex[:12]}"
    return {
        "thread_id": thread_id,
        "created_at": datetime.now().isoformat(),
        "metadata": {}
    }


@app.get("/assistants")
async def list_assistants():
    """List available assistants (mimics LangGraph Cloud API)"""
    return [
        {
            "assistant_id": "document_generator",
            "name": "Document Generator",
            "description": "Generates documents based on prompts",
            "created_at": datetime.now().isoformat()
        }
    ]


@app.post("/threads/{thread_id}/runs")
async def create_run(thread_id: str, request: Request):
    """Create a new run and execute the agent"""
    body = await request.json()
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    
    # Store run info for later retrieval
    run_info = {
        "run_id": run_id,
        "thread_id": thread_id,
        "assistant_id": body.get("assistant_id", "document_generator"),
        "status": "pending",
        "created_at": datetime.now().isoformat(),
        "input": body.get("input", {}),
        "metadata": body.get("metadata", {})
    }
    
    # Extract input data
    input_data = body.get("input", {})
    
    # Log the input data for debugging
    print(f"[Local Server] Creating run with input: {json.dumps(input_data, indent=2)}")
    
    # Create initial state for the agent
    initial_state = AgentState(
        task=input_data.get("task", ""),
        account_data=input_data.get("account_data", {}),
        document_id=input_data.get("document_id", str(uuid.uuid4())),
        user_id=input_data.get("user_id", "local-user"),
        thread_id=thread_id,
        run_id=run_id,
        complete=False,
        document_content="",
        failed_events=[]
    )
    
    # Execute the agent asynchronously (fire and forget)
    asyncio.create_task(execute_agent(initial_state, run_id))
    
    # Return immediately with run info
    run_info["status"] = "running"
    return run_info


async def execute_agent(state: AgentState, run_id: str):
    """Execute the agent in the background"""
    try:
        print(f"[Local Server] Executing agent for run: {run_id}")
        print(f"[Local Server] Document ID: {state['document_id']}")
        print(f"[Local Server] Task: {state['task'][:100]}...")
        
        # Ensure the document exists in the database first
        try:
            # Check if document exists
            check_result = supabase.table("documents").select("id").eq("id", state["document_id"]).execute()
            
            if not check_result.data:
                print(f"[Local Server] Document {state['document_id']} doesn't exist, creating it...")
                
                # Get account_id from state
                account_id = state["account_data"].get("id")
                if not account_id:
                    print(f"[Local Server] ERROR: No account_id provided")
                    raise Exception("Account ID is required")
                
                # Create the document
                create_result = supabase.table("documents").insert({
                    "id": state["document_id"],
                    "title": f"AI Generated Document",
                    "account_id": account_id,  # Can be None
                    "author_id": state["user_id"],
                    "generation_status": "generating",
                    "generation_started_at": datetime.now().isoformat(),
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }).execute()
                print(f"[Local Server] Document created successfully")
            else:
                print(f"[Local Server] Document {state['document_id']} already exists")
                
        except Exception as doc_error:
            print(f"[Local Server] Error ensuring document exists: {doc_error}")
            # Continue anyway - the agent will handle it
        
        # Run the agent
        result = await graph.ainvoke(state)
        
        print(f"[Local Server] Agent execution complete for run: {run_id}")
        print(f"[Local Server] Document generated: {len(result.get('document_content', ''))} characters")
        
    except Exception as e:
        print(f"[Local Server] Error executing agent for run {run_id}: {e}")
        import traceback
        traceback.print_exc()


@app.post("/runs/stream")
async def create_run_stream(request: Request):
    """
    Stream endpoint that mimics LangGraph Cloud API
    Handles document generation requests
    """
    try:
        body = await request.json()
        
        # Extract input from the request
        assistant_id = body.get("assistant_id", "document_generator")
        thread_id = body.get("thread", {}).get("id", f"thread-{uuid.uuid4().hex[:12]}")
        
        # Get the input data
        input_data = body.get("input", {})
        task = input_data.get("task", "")
        account_data = input_data.get("account_data", {})
        document_id = input_data.get("document_id", str(uuid.uuid4()))
        user_id = input_data.get("user_id", "local-user")
        
        print(f"[Local Server] Starting stream for document: {document_id}")
        print(f"[Local Server] Task: {task[:100]}...")
        
        # Create initial state
        initial_state = AgentState(
            task=task,
            account_data=account_data,
            document_id=document_id,
            user_id=user_id,
            thread_id=thread_id,
            run_id=f"run-{uuid.uuid4().hex[:12]}",
            complete=False,
            document_content="",
            failed_events=[]
        )
        
        async def generate_events():
            """Generate SSE events as the agent processes"""
            try:
                # Send initial event
                yield f"data: {json.dumps({'event': 'start', 'data': {'document_id': document_id}})}\n\n"
                
                # Run the agent
                print("[Local Server] Invoking graph...")
                result = await graph.ainvoke(initial_state)
                
                # Send completion event with document content
                yield f"data: {json.dumps({'event': 'complete', 'data': {'content': result.get('document_content', ''), 'document_id': document_id}})}\n\n"
                
                print(f"[Local Server] Generation complete for document: {document_id}")
                
            except Exception as e:
                print(f"[Local Server] Error in generation: {e}")
                yield f"data: {json.dumps({'event': 'error', 'data': {'error': str(e)}})}\n\n"
        
        return StreamingResponse(
            generate_events(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable Nginx buffering
            }
        )
        
    except Exception as e:
        print(f"[Local Server] Error handling request: {e}")
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json"
        )


@app.post("/feedback")
async def handle_feedback(request: Request):
    """
    Handle feedback endpoint (currently just logs)
    """
    try:
        body = await request.json()
        print(f"[Local Server] Feedback received: {json.dumps(body, indent=2)}")
        
        return {
            "status": "success",
            "message": "Feedback logged locally"
        }
        
    except Exception as e:
        print(f"[Local Server] Error handling feedback: {e}")
        return Response(
            content=json.dumps({"error": str(e)}),
            status_code=500,
            media_type="application/json"
        )


if __name__ == "__main__":
    # Check for required environment variables
    required_vars = ["OPENAI_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        print(f"[Local Server] ERROR: Missing environment variables: {', '.join(missing)}")
        print("[Local Server] Please create a .env file in the agent directory with these variables")
        exit(1)
    
    # Run the server
    port = int(os.getenv("LANGGRAPH_LOCAL_PORT", "8123"))
    print(f"[Local Server] Starting LangGraph local server on port {port}")
    print(f"[Local Server] Vite should proxy to http://localhost:{port}")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )