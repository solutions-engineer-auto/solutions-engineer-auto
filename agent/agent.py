"""
Enhanced Document Generation Agent with Modular Architecture
This agent uses a sophisticated linear workflow with multiple specialized nodes.
Version: 2.0.0 - Modular architecture with enhanced capabilities
"""

import os
import sys
import asyncio
from datetime import datetime
import uuid

from langgraph.graph import StateGraph, END

# Import our modular components
from state import AgentState, initialize_state
from nodes.account_fetch import fetch_account_data
from nodes.retrieval import retrieve_and_score_documents
from nodes.analysis import analyze_context
from nodes.planning import plan_document
from nodes.generation import generate_sections
from nodes.validation import validate_document
from nodes.assembly import assemble_and_polish
from utils.supabase_client import supabase_manager
from constants.events import EventTypes

# Validate required environment variables
required_vars = {
    "OPENAI_API_KEY": "OpenAI API key for LLM calls",
    "VITE_SUPABASE_URL": "Supabase project URL",
    "VITE_SUPABASE_SERVICE_KEY": "Supabase service key for bypassing RLS"
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

print(f"[Agent] Enhanced modular agent initialized with model: {os.getenv('OPENAI_MODEL', 'gpt-4o-mini')}")


async def initialize_document(state: AgentState) -> AgentState:
    """Initialize document record and log initial messages"""
    
    # Validate required state fields
    required_fields = ["task", "document_id", "user_id", "account_data"]
    for field in required_fields:
        if not state.get(field):
            error_msg = f"Missing required field: {field}"
            print(f"[Agent] ERROR: {error_msg}")
            state["complete"] = True
            state["document_content"] = f"# Error\n\n{error_msg}"
            state["errors"] = state.get("errors", []) + [error_msg]
            return state
    
    print(f"[Agent] Starting enhanced workflow for document: {state['document_id']}")
    print(f"[Agent] Task: {state['task'][:100]}...")
    
    # Generate run_id if not provided
    if not state.get("run_id"):
        state["run_id"] = f"run-{uuid.uuid4().hex[:12]}"
    
    # Create document record
    account_id = state["account_data"].get("id")
    if not account_id:
        error_msg = "No account_id provided in account_data"
        state["complete"] = True
        state["document_content"] = f"# Error\n\n{error_msg}"
        state["errors"] = state.get("errors", []) + [error_msg]
        return state
    
    # Create document in database
    success = await supabase_manager.create_document_record(
        document_id=state["document_id"],
        account_id=account_id,
        author_id=state["user_id"],
        title=f"Document for {state['account_data'].get('name', 'Unknown')}"
    )
    
    if not success:
        state["complete"] = True
        state["document_content"] = "# Error\n\nFailed to create document record."
        state["errors"] = state.get("errors", []) + ["Failed to create document record"]
        return state
    
    # Log user message
    await supabase_manager.log_message(
        document_id=state["document_id"],
        role="user",
        content=state["task"],
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Log workflow start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.WORKFLOW_STARTED,
        content="Starting enhanced document generation workflow",
        data={
            "account_name": state["account_data"].get("name"),
            "workflow_version": "2.0.0"
        },
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    return state


async def finalize_document(state: AgentState) -> AgentState:
    """Finalize document generation and update status"""
    print(f"[Agent] Starting finalize_document for document: {state['document_id']}")
    
    # Ensure document_content exists even if there was an error
    if not state.get("document_content"):
        print(f"[Agent] No document_content found, creating error document")
        if state.get("errors"):
            state["document_content"] = f"# Document Generation Error\n\nErrors encountered:\n" + "\n".join(f"- {err}" for err in state["errors"])
        else:
            state["document_content"] = "# Document Generation Failed\n\nNo content was generated."
    
    # Update document status
    await supabase_manager.update_document_status(
        document_id=state["document_id"],
        status="complete"
    )
    
    # Log workflow completion
    total_duration = sum(state.get("stage_timings", {}).values())
    
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.WORKFLOW_COMPLETED,
        content="Enhanced document generation workflow complete",
        data={
            "total_duration_seconds": total_duration,
            "stages_completed": state.get("completed_stages", []),
            "quality_score": state.get("overall_quality_score", 0),
            "total_words": len(state.get("document_content", "").split()),
            "errors": state.get("errors", [])
        },
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Log final content as event (for real-time updates)
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.DOCUMENT_READY,
        content="Document is ready for review",
        data={
            "content": state.get("document_content", "")
        },
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Log assistant message
    await supabase_manager.log_message(
        document_id=state["document_id"],
        role="assistant",
        content=f"I've successfully generated your document using our enhanced workflow. The document went through {len(state.get('completed_stages', []))} processing stages with an overall quality score of {state.get('overall_quality_score', 0):.2f}. You can now review and edit it as needed.",
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    state["complete"] = True
    print(f"[Agent] Enhanced workflow completed successfully")
    print(f"[Agent] Final document length: {len(state.get('document_content', ''))}")
    print(f"[Agent] Completed stages: {state.get('completed_stages', [])}")
    print(f"[Agent] Total errors: {len(state.get('errors', []))}")
    return state


def handle_workflow_with_timeout(workflow_func):
    """Wrapper to add timeout to any workflow function"""
    async def wrapper(state: AgentState) -> AgentState:
        try:
            # 5-minute timeout for entire workflow
            return await asyncio.wait_for(
                workflow_func(state),
                timeout=300
            )
        except asyncio.TimeoutError:
            print(f"[Agent] ERROR: Workflow timed out")
            state["errors"] = state.get("errors", []) + ["Workflow timeout"]
            state["document_content"] = state.get("document_content") or "# Timeout Error\n\nThe document generation timed out."
            state["complete"] = True
            return state
        except Exception as e:
            import traceback
            print(f"[Agent] ERROR: Unexpected error: {e}")
            print(f"[Agent] Traceback:\n{traceback.format_exc()}")
            state["errors"] = state.get("errors", []) + [str(e)]
            state["document_content"] = state.get("document_content") or f"# Error\n\n{str(e)}"
            state["complete"] = True
            return state
    return wrapper


# Build the enhanced workflow graph
def build_graph():
    """Build the sophisticated linear document generation workflow"""
    workflow = StateGraph(AgentState)
    
    # Add all nodes to the workflow
    workflow.add_node("initialize", initialize_document)
    workflow.add_node("fetch_account", handle_workflow_with_timeout(fetch_account_data))
    workflow.add_node("retrieve", handle_workflow_with_timeout(retrieve_and_score_documents))
    workflow.add_node("analyze", handle_workflow_with_timeout(analyze_context))
    workflow.add_node("plan", handle_workflow_with_timeout(plan_document))
    workflow.add_node("generate", handle_workflow_with_timeout(generate_sections))
    workflow.add_node("validate", handle_workflow_with_timeout(validate_document))
    workflow.add_node("assemble", handle_workflow_with_timeout(assemble_and_polish))
    workflow.add_node("finalize", finalize_document)
    
    # Set entry point
    workflow.set_entry_point("initialize")
    
    # Define the linear flow
    workflow.add_edge("initialize", "fetch_account")
    workflow.add_edge("fetch_account", "retrieve")
    workflow.add_edge("retrieve", "analyze")
    workflow.add_edge("analyze", "plan")
    workflow.add_edge("plan", "generate")
    workflow.add_edge("generate", "validate")
    workflow.add_edge("validate", "assemble")
    workflow.add_edge("assemble", "finalize")
    workflow.add_edge("finalize", END)
    
    return workflow.compile()


# Export for LangGraph Cloud
graph = build_graph()


# For testing
if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    
    async def test_agent():
        # Load env vars for testing
        load_dotenv()
        
        # Test with mock input
        initial_state = initialize_state(
            task="Generate a comprehensive proposal for migrating our infrastructure to AWS. We need to modernize our legacy systems and improve scalability.",
            account_data={
                "name": "TechCorp Industries",
                "id": "acc-123",
                "contact": "Jane Smith, CTO",
                "stage": "Evaluation",
                "value": "$150,000"
            },
            document_id=str(uuid.uuid4()),
            user_id="test-user-123"
        )

        print("[Test] Starting enhanced document generation workflow...")
        result = await graph.ainvoke(initial_state)
        
        print("\n[Test] Final Results:")
        print(f"Document ID: {result.get('document_id')}")
        print(f"Complete: {result.get('complete')}")
        print(f"Stages Completed: {result.get('completed_stages', [])}")
        print(f"Quality Score: {result.get('overall_quality_score', 0):.2f}")
        print(f"Total Words: {len(result.get('document_content', '').split())}")
        print(f"Errors: {result.get('errors', [])}")
        
        if result.get('stage_timings'):
            print("\nStage Timings:")
            for stage, duration in result['stage_timings'].items():
                print(f"  - {stage}: {duration:.2f}s")
        
        print("\nDocument Preview:")
        print(result.get('document_content', '')[:1000] + "...")

    asyncio.run(test_agent())
