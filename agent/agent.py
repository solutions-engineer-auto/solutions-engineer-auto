"""
Enhanced Document Generation Agent with Supabase Integration
This agent writes directly to Supabase for realtime updates
"""

import os
from typing import TypedDict, Dict, Any, List
from datetime import datetime
import uuid

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from supabase import create_client, Client

# Initialize clients
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY")
)

# Initialize Supabase client with service key
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")  # Service key bypasses RLS
)

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
    
    print(f"[Agent] Starting generation for document: {state['document_id']}")
    
    # Log user message
    try:
        supabase.table("chat_messages").insert({
            "document_id": state["document_id"],
            "role": "user",
            "content": state["task"],
            "message_type": "message",
            "thread_id": state["thread_id"],
            "run_id": state["run_id"]
        }).execute()
    except Exception as e:
        print(f"[Agent] Failed to log user message: {e}")
    
    # Log start event
    await log_event(state, "start", "Starting document generation", {
        "account_name": state["account_data"].get("name", "Unknown")
    })
    
    # Create document record if it doesn't exist
    try:
        supabase.table("documents").insert({
            "id": state["document_id"],
            "title": f"Document for {state['account_data'].get('name', 'Unknown')}",
            "account_id": state["account_data"].get("id"),
            "author_id": state["user_id"],
            "generation_status": "generating",
            "generation_started_at": datetime.now().isoformat()
        }).execute()
    except Exception as e:
        # Document might already exist, update it
        await update_document(state, {
            "generation_status": "generating",
            "generation_started_at": datetime.now().isoformat()
        })
    
    # Log analysis phase
    await log_event(state, "analyze", "Analyzing account information", {
        "account_data": state["account_data"]
    })
    
    # Generate content in sections for incremental updates
    sections = [
        ("introduction", "Creating introduction"),
        ("analysis", "Analyzing requirements"),
        ("recommendations", "Generating recommendations"),
        ("conclusion", "Writing conclusion")
    ]
    
    state["document_content"] = f"# Document for {state['account_data'].get('name', 'Unknown')}\n\n"
    
    for i, (section_name, section_description) in enumerate(sections):
        # Log section start
        await log_event(state, "section_start", section_description, {
            "section": section_name,
            "progress": (i / len(sections)) * 100
        })
        
        # Generate section content
        section_prompt = f"""Generate the {section_name} section for:
        Task: {state['task']}
        Client: {state['account_data'].get('name')}
        Context: {state['account_data']}
        """
        
        try:
            response = await llm.ainvoke(section_prompt)
            section_content = f"\n## {section_name.title()}\n\n{response.content}\n"
            state["document_content"] += section_content
            
            # Update document incrementally
            await update_document(state, {
                "content": state["document_content"]
            })
            
            # Log section completion
            await log_event(state, "section_complete", f"Completed {section_name}", {
                "section": section_name,
                "progress": ((i + 1) / len(sections)) * 100,
                "word_count": len(section_content.split())
            })
            
        except Exception as e:
            await log_event(state, "error", f"Error generating {section_name}: {str(e)}", {
                "section": section_name,
                "error": str(e)
            })
    
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
    return state


# Build the graph
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("generate", generate_document)
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
            "document_id": f"doc-{int(datetime.now().timestamp())}",
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