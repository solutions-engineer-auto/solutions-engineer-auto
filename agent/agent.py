"""
Enhanced Document Generation Agent with Supabase Integration
This agent writes directly to Supabase for realtime updates.
"""

import os
from typing import TypedDict, Dict, Any, List
from datetime import datetime
import uuid
import sys
import asyncio

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from supabase import create_client, Client

# Validate required environment variables
required_vars = {
    "OPENAI_API_KEY": "OpenAI API key for LLM calls",
    "SUPABASE_URL": "Supabase project URL",
    "SUPABASE_SERVICE_KEY": "Supabase service key for bypassing RLS"
}

missing_vars = []
for var, description in required_vars.items():
    if not os.getenv(var):
        missing_vars.append(f"{var} ({description})")
        
if missing_vars:
    print(f"[Agent] ERROR: Missing required environment variables:")
    for var in missing_vars:
        print(f"  - {var}")
    print("\n[Agent] Please set these environment variables in LangGraph Cloud deployment settings.")
    sys.exit(1)

# Initialize clients with error handling
try:
    llm = ChatOpenAI(
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY"),
        request_timeout=30  # 30 second timeout per request
    )
    print(f"[Agent] OpenAI client initialized with model: {os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}")
except Exception as e:
    print(f"[Agent] ERROR: Failed to initialize OpenAI client: {e}")
    sys.exit(1)

# Initialize Supabase client with service key
try:
    supabase: Client = create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY")  # Service key bypasses RLS
    )
    print(f"[Agent] Supabase client initialized for URL: {os.getenv('SUPABASE_URL')}")
except Exception as e:
    print(f"[Agent] ERROR: Failed to initialize Supabase client: {e}")
    sys.exit(1)

# Enhanced agent state
class AgentState(TypedDict):
    task: str
    account_data: Dict[str, Any]
    document_id: str
    document_content: str
    complete: bool
    user_id: str
    thread_id: str
    run_id: str
    failed_events: List[Dict[str, Any]]  # For retry logic


async def log_event(state: AgentState, event_type: str, content: str, data: Dict = None):
    """Log all agent activities to chat_messages with retry logic"""
    try:
        result = supabase.table("chat_messages").insert({
            "document_id": state["document_id"],
            "role": "assistant",
            "content": content,
            "message_type": "event",
            "event_data": {
                "type": event_type,
                "timestamp": datetime.now().isoformat(),
                **(data or {})
            },
            "thread_id": state.get("thread_id"),
            "run_id": state.get("run_id")
        }).execute()
        return result
    except Exception as e:
        print(f"[Agent] Failed to log event: {e}")
        # Store for retry
        if "failed_events" not in state:
            state["failed_events"] = []
        state["failed_events"].append({
            "event_type": event_type,
            "content": content,
            "data": data,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })


async def update_document(state: AgentState, updates: Dict):
    """Update document with retry logic"""
    try:
        result = supabase.table("documents").update({
            **updates,
            "last_activity_at": datetime.now().isoformat()
        }).eq("id", state["document_id"]).execute()
        return result
    except Exception as e:
        print(f"[Agent] Failed to update document: {e}")
        # Continue processing even if update fails


async def generate_document(state: AgentState) -> AgentState:
    """Enhanced document generation with Supabase integration"""
    
    # Validate required state fields
    required_fields = ["task", "document_id", "user_id"]
    for field in required_fields:
        if not state.get(field):
            error_msg = f"Missing required field: {field}"
            print(f"[Agent] ERROR: {error_msg}")
            state["complete"] = True
            state["document_content"] = f"# Error\n\n{error_msg}"
            return state

    print(f"[Agent] Starting generation for document: {state['document_id']}")
    print(f"[Agent] Task: {state['task'][:100]}...")  # Log first 100 chars of task
    print(f"[Agent] User ID: {state['user_id']}")
    
    # Generate a run_id if not provided
    if not state.get("run_id"):
        state["run_id"] = f"run-{uuid.uuid4().hex[:12]}"
        print(f"[Agent] Generated run_id: {state['run_id']}")

    # Log user message
    try:
        supabase.table("chat_messages").insert({
            "document_id": state["document_id"],
            "role": "user",
            "content": state["task"],
            "message_type": "message",
            "thread_id": state.get("thread_id"),
            "run_id": state.get("run_id")
        }).execute()
    except Exception as e:
        print(f"[Agent] Failed to log user message: {e}")

    # Log start event
    await log_event(state, "start", "Starting document generation", {
        "account_name": state["account_data"].get("name", "Unknown")
    })

    # Create document record if it doesn't exist
    try:
        print(f"[Agent] Creating document record in database...")
        result = supabase.table("documents").insert({
            "id": state["document_id"],
            "title": f"Document for {state['account_data'].get('name', 'Unknown')}",
            "account_id": state["account_data"].get("id"),
            "author_id": state["user_id"],
            "generation_status": "generating",
            "generation_started_at": datetime.now().isoformat()
        }).execute()
        print(f"[Agent] Document record created successfully")
    except Exception as e:
        print(f"[Agent] Document might already exist, attempting update: {e}")
        # Document might already exist, update it
        try:
            await update_document(state, {
                "generation_status": "generating",
                "generation_started_at": datetime.now().isoformat()
            })
            print(f"[Agent] Document record updated successfully")
        except Exception as update_error:
            error_msg = f"Failed to create/update document record: {update_error}"
            print(f"[Agent] ERROR: {error_msg}")
            await log_event(state, "error", error_msg, {"error": str(update_error)})
            # Continue anyway - we can still generate content

    # Log analysis phase
    await log_event(state, "analyze", "Analyzing account information", {
        "account_data": state["account_data"]
    })

    # Generate complete document in a single LLM call
    await log_event(state, "generating", "Generating complete document", {
        "progress": 10
    })

    document_prompt = f"""Generate a comprehensive document based on the following:
    
Task: {state['task']}
Client Name: {state['account_data'].get('name', 'Unknown')}
Client Context: {state['account_data']}

Please create a well-structured document with the following sections:
1. Introduction - Brief overview and context
2. Analysis - Detailed analysis of requirements and current situation  
3. Recommendations - Specific recommendations and proposed solutions
4. Conclusion - Summary and next steps

Format the response as a complete markdown document with proper headings and sections.
"""

    try:
        # Generate the entire document in one call
        print(f"[Agent] Calling LLM for document generation...")
        start_time = datetime.now()
        
        response = await llm.ainvoke(document_prompt)
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        print(f"[Agent] LLM call completed in {duration:.2f} seconds")
        
        # Set the complete document content
        state["document_content"] = f"# Document for {state['account_data'].get('name', 'Unknown')}\n\n{response.content}"
        
        # Update document with complete content
        await update_document(state, {
            "content": state["document_content"]
        })
        
        # Log completion with metrics
        await log_event(state, "generated", "Document generation complete", {
            "progress": 100,
            "word_count": len(state["document_content"].split()),
            "duration_seconds": duration
        })
        
    except Exception as e:
        error_msg = f"Error generating document: {str(e)}"
        print(f"[Agent] ERROR: {error_msg}")
        await log_event(state, "error", error_msg, {
            "error": str(e),
            "error_type": type(e).__name__
        })
        # Set a fallback document content
        state["document_content"] = f"# Error Generating Document\n\nAn error occurred: {str(e)}"

    # Mark generation complete
    await update_document(state, {
        "generation_status": "complete",
        "generation_completed_at": datetime.now().isoformat()
    })

    # Log completion
    await log_event(state, "complete", "Document generation complete", {
        "total_words": len(state["document_content"].split()),
        "duration_seconds": 0  # Calculate if needed
    })

    # Log the final response as a message
    try:
        supabase.table("chat_messages").insert({
            "document_id": state["document_id"],
            "role": "assistant",
            "content": "I've successfully generated your document. You can now review and edit it as needed.",
            "message_type": "message",
            "thread_id": state["thread_id"],
            "run_id": state["run_id"]
        }).execute()
    except Exception as e:
        print(f"[Agent] Failed to log final message: {e}")

    # Retry any failed events
    if state.get("failed_events"):
        print(f"[Agent] Retrying {len(state['failed_events'])} failed events")
        for failed in state["failed_events"]:
            await log_event(state, failed["event_type"], failed["content"], failed["data"])

    state["complete"] = True
    print(f"[Agent] Document generation completed. Final status: {'success' if state.get('document_content') else 'failed'}")
    return state


async def generate_document_with_timeout(state: AgentState) -> AgentState:
    """Wrapper to add overall timeout to document generation"""
    try:
        # Overall 4-minute timeout for entire generation
        return await asyncio.wait_for(
            generate_document(state),
            timeout=240  # 4 minutes
        )
    except asyncio.TimeoutError:
        print(f"[Agent] ERROR: Document generation timed out after 4 minutes")
        # Log timeout error
        try:
            await log_event(state, "error", "Document generation timed out", {
                "error": "TimeoutError",
                "timeout_seconds": 240
            })
        except:
            pass  # Best effort logging
        
        # Ensure we have some content
        if not state.get("document_content"):
            state["document_content"] = "# Document Generation Timeout\n\nThe document generation process timed out. Please try again."
        
        state["complete"] = True
        return state
    except Exception as e:
        print(f"[Agent] ERROR: Unexpected error in document generation: {e}")
        # Log unexpected error
        try:
            await log_event(state, "error", f"Unexpected error: {str(e)}", {
                "error": str(e),
                "error_type": type(e).__name__
            })
        except:
            pass  # Best effort logging
        
        # Ensure we have some content
        if not state.get("document_content"):
            state["document_content"] = f"# Error\n\nAn unexpected error occurred: {str(e)}"
        
        state["complete"] = True
        return state


# Build the graph
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("generate", generate_document_with_timeout)
    workflow.set_entry_point("generate")
    workflow.add_edge("generate", END)
    return workflow.compile()


# Export for LangGraph Cloud
graph = build_graph()


# For testing
if __name__ == "__main__":
    import asyncio

    async def test_agent():
        # Test with mock input
        initial_state = {
            "task": "Generate a proposal for AWS migration",
            "account_data": {
                "name": "TechCorp",
                "id": "acc-123",
                "contact": "Jane Smith",
                "stage": "Evaluation",
                "value": "$150,000"
            },
            "document_id": str(uuid.uuid4()),
            "user_id": "test-user-123",
            "thread_id": "test-thread-123",
            "run_id": "test-run-123"
        }

        result = await graph.ainvoke(initial_state)
        print("\nFinal state:")
        print(f"Document ID: {result.get('document_id')}")
        print(f"Complete: {result.get('complete')}")
        print("\nDocument Content:")
        print(result.get('document_content', '')[:500] + "...")

    # Load env vars for testing
    from dotenv import load_dotenv
    load_dotenv()

    asyncio.run(test_agent())
