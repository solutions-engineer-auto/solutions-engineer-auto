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
from typing import Dict, Any, List
import logging
from collections import defaultdict

# Load environment variables FIRST before any other imports
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
from supabase import create_client, Client

# Import your existing agent (after env vars are loaded)
from agent import graph
from state import AgentState, initialize_state
from constants.events import EventTypes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("LocalAgent")

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("VITE_SUPABASE_URL"),
    os.getenv("VITE_SUPABASE_SERVICE_KEY")
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

# Global event store for real-time monitoring
event_store: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
active_runs: Dict[str, Dict[str, Any]] = {}

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"{request.method} {request.url.path}")
    response = await call_next(request)
    logger.info(f"Response status: {response.status_code}")
    return response


def log_agent_event(run_id: str, event_type: str, content: str, data: Dict[str, Any] = None):
    """Log an agent event for monitoring"""
    event = {
        "timestamp": datetime.now().isoformat(),
        "event_type": event_type,
        "content": content,
        "data": data or {}
    }
    
    # Store in memory for retrieval
    event_store[run_id].append(event)
    
    # Log to console with color coding
    level_map = {
        "start": logging.INFO,
        "complete": logging.INFO,
        "error": logging.ERROR,
        "workflow_start": logging.INFO,
        "workflow_complete": logging.INFO,
        "retrieval_start": logging.DEBUG,
        "retrieval_complete": logging.DEBUG,
        "analysis_start": logging.DEBUG,
        "analysis_complete": logging.DEBUG,
        "planning_start": logging.DEBUG,
        "planning_complete": logging.DEBUG,
        "generation_start": logging.DEBUG,
        "generation_complete": logging.DEBUG,
        "validation_start": logging.DEBUG,
        "validation_complete": logging.DEBUG,
        "assembly_start": logging.DEBUG,
        "assembly_complete": logging.DEBUG,
    }
    
    log_level = level_map.get(event_type, logging.INFO)
    logger.log(log_level, f"[{run_id}] {event_type}: {content}")
    
    if data:
        logger.debug(f"[{run_id}] Data: {json.dumps(data, indent=2)}")


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


@app.get("/runs/{run_id}/events")
async def get_run_events(run_id: str):
    """Get all events for a specific run"""
    return {
        "run_id": run_id,
        "status": active_runs.get(run_id, {}).get("status", "unknown"),
        "events": event_store.get(run_id, [])
    }


@app.get("/runs/active")
async def get_active_runs():
    """Get all currently active runs"""
    return {
        "active_runs": [
            {
                "run_id": run_id,
                "document_id": info.get("document_id"),
                "status": info.get("status"),
                "start_time": info.get("start_time").isoformat() if info.get("start_time") else None,
                "duration": (datetime.now() - info.get("start_time")).total_seconds() if info.get("start_time") else 0
            }
            for run_id, info in active_runs.items()
        ]
    }


@app.post("/threads/{thread_id}/runs")
async def create_run(thread_id: str, request: Request):
    """Create a new run and execute the agent"""
    body = await request.json()
    run_id = f"run-{uuid.uuid4().hex[:12]}"
    
    logger.info(f"Creating run {run_id} for thread {thread_id}")
    logger.debug(f"Request body: {json.dumps(body, indent=2)}")
    
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
    
    # Log the input data
    log_agent_event(run_id, "run_created", f"Run created for document generation", {
        "thread_id": thread_id,
        "task_preview": input_data.get("task", "")[:200],
        "account": input_data.get("account_data", {}).get("name", "Unknown")
    })
    
    # Create initial state for the agent
    initial_state = initialize_state(
        task=input_data.get("task", ""),
        account_data=input_data.get("account_data", {}),
        document_id=input_data.get("document_id", str(uuid.uuid4())),
        user_id=input_data.get("user_id", "local-user"),
        thread_id=thread_id,
        run_id=run_id
    )
    
    # Execute the agent asynchronously (fire and forget)
    log_agent_event(run_id, "task_created", "Creating async task for agent execution")
    task = asyncio.create_task(execute_agent(initial_state, run_id))
    
    # Add error logging for the task
    def task_done_callback(future):
        try:
            future.result()
            log_agent_event(run_id, "task_complete", "Async task completed successfully")
        except Exception as e:
            log_agent_event(run_id, "task_error", f"Async task failed: {str(e)}")
            import traceback
            logger.error(f"Task traceback:\n{traceback.format_exc()}")
    
    task.add_done_callback(task_done_callback)
    
    # Return immediately with run info
    run_info["status"] = "running"
    logger.info(f"Returning run info for {run_id}")
    return run_info


async def execute_agent(state: AgentState, run_id: str):
    """Execute the agent in the background with comprehensive logging"""
    try:
        # Mark run as active
        active_runs[run_id] = {
            "start_time": datetime.now(),
            "document_id": state['document_id'],
            "status": "running"
        }
        
        log_agent_event(run_id, "start", f"Starting agent execution", {
            "document_id": state['document_id'],
            "task": state['task'][:200],
            "account": state.get('account_data', {}).get('name', 'Unknown')
        })
        
        # Ensure the document exists in the database first
        try:
            # Check if document exists
            check_result = supabase.table("documents").select("id").eq("id", state["document_id"]).execute()
            
            if not check_result.data:
                log_agent_event(run_id, "document_create", f"Creating document record", {
                    "document_id": state['document_id']
                })
                
                # Get account_id from state
                account_id = state["account_data"].get("id")
                if not account_id:
                    log_agent_event(run_id, "error", "No account_id provided")
                    raise Exception("Account ID is required")
                
                # Create the document
                create_result = supabase.table("documents").insert({
                    "id": state["document_id"],
                    "title": f"AI Generated Document",
                    "account_id": account_id,
                    "author_id": state["user_id"],
                    "generation_status": "generating",
                    "generation_started_at": datetime.now().isoformat(),
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }).execute()
                log_agent_event(run_id, "document_created", "Document record created successfully")
            else:
                log_agent_event(run_id, "document_exists", "Document already exists")
                
        except Exception as doc_error:
            log_agent_event(run_id, "error", f"Error ensuring document exists: {doc_error}")
            # Continue anyway - the agent will handle it
        
        # Run the agent
        log_agent_event(run_id, "workflow_start", "Starting LangGraph workflow")
        
        result = await graph.ainvoke(state)
        
        # Stop monitoring
        if run_id in active_runs:
            del active_runs[run_id]
        
        # Log completion
        log_agent_event(run_id, "workflow_complete", "Agent execution complete", {
            "document_length": len(result.get('document_content', '')),
            "errors": result.get('errors', []),
            "completed_stages": result.get('completed_stages', []),
            "total_duration": (datetime.now() - active_runs.get(run_id, {}).get('start_time', datetime.now())).total_seconds()
        })
        
        # Log document preview
        if result.get('document_content'):
            log_agent_event(run_id, EventTypes.DOCUMENT_READY, "Document generated successfully", {
                "preview": result['document_content'][:500] + "..."
            })
        
    except Exception as e:
        log_agent_event(run_id, "error", f"Critical error: {str(e)}")
        if run_id in active_runs:
            active_runs[run_id]["status"] = "failed"
        import traceback
        logger.error(f"Traceback for run {run_id}:\n{traceback.format_exc()}")


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
        initial_state = initialize_state(
            task=task,
            account_data=account_data,
            document_id=document_id,
            user_id=user_id,
            thread_id=thread_id,
            run_id=f"run-{uuid.uuid4().hex[:12]}"
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
    required_vars = ["OPENAI_API_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_SERVICE_KEY"]
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        logger.error(f"Missing environment variables: {', '.join(missing)}")
        logger.error("Please create a .env file in the agent directory with these variables")
        exit(1)
    
    # Run the server
    port = int(os.getenv("LANGGRAPH_LOCAL_PORT", "8123"))
    
    print("\n" + "="*60)
    print("🚀 LangGraph Local Agent Server")
    print("="*60)
    print(f"📍 Server URL: http://localhost:{port}")
    print(f"🤖 Model: {os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}")
    print(f"📊 Monitoring endpoints:")
    print(f"   - Active runs: http://localhost:{port}/runs/active")
    print(f"   - Run events: http://localhost:{port}/runs/{{run_id}}/events")
    print(f"🔧 Health check: http://localhost:{port}/health")
    print("="*60)
    print("📝 Agent activity will be logged below:\n")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="info"
    )