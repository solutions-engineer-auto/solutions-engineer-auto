"""
Simple Document Generation Agent for LangGraph Cloud
This module exports a minimal graph that makes a single LLM call
"""

import os
from typing import TypedDict, Dict, Any
from datetime import datetime
import uuid

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI

# Initialize LLM
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4"),
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY")
)


# Define minimal agent state
class AgentState(TypedDict):
    task: str
    account_data: Dict[str, Any]
    document_id: str
    document_content: str
    complete: bool


# Single node function that generates a document
async def generate_document(state: AgentState) -> AgentState:
    """Simple function that makes one LLM call and returns"""
    
    print(f"[Simple Agent] Starting generation for task: {state.get('task', 'No task')}")
    
    # Initialize document ID if not set
    if not state.get("document_id"):
        state["document_id"] = f"doc-{uuid.uuid4().hex[:8]}"
        print(f"[Simple Agent] Created document ID: {state['document_id']}")
    
    # Extract account info
    account_name = state.get("account_data", {}).get("name", "Unknown Company")
    account_info = state.get("account_data", {})
    
    # Create a simple prompt
    prompt = f"""Generate a professional document for the following request:

Task: {state.get('task', 'Create a document')}

Client Information:
- Company: {account_name}
- Contact: {account_info.get('contact', 'N/A')}
- Stage: {account_info.get('stage', 'N/A')}
- Value: {account_info.get('value', 'N/A')}

Please create a concise, professional document that addresses the task.
Format it with clear sections and markdown formatting."""

    print(f"[Simple Agent] Calling LLM...")
    
    try:
        # Make the LLM call
        response = llm.invoke(prompt)
        
        # Set the document content
        state["document_content"] = f"# Document for {account_name}\n\n" + response.content
        state["complete"] = True
        
        print(f"[Simple Agent] Document generated successfully")
        print(f"[Simple Agent] Document preview: {state['document_content'][:200]}...")
        
    except Exception as e:
        print(f"[Simple Agent] Error generating document: {e}")
        state["document_content"] = f"Error generating document: {str(e)}"
        state["complete"] = True
    
    return state


# Build the simple graph
def build_graph():
    """Build a minimal graph with just one node"""
    workflow = StateGraph(AgentState)
    
    # Add single node
    workflow.add_node("generate", generate_document)
    
    # Set entry point
    workflow.set_entry_point("generate")
    
    # Single edge to END
    workflow.add_edge("generate", END)
    
    return workflow.compile()


# Export the compiled graph for LangGraph Cloud
graph = build_graph()


# For testing
if __name__ == "__main__":
    import asyncio
    
    async def test_agent():
        # Test with mock input
        initial_state = {
            "task": "Generate a proposal for AWS migration for TechCorp",
            "account_data": {
                "name": "TechCorp",
                "contact": "Jane Smith",
                "stage": "Evaluation",
                "value": "$150,000"
            }
        }
        
        result = await graph.ainvoke(initial_state)
        print("\nFinal state:")
        print(f"Document ID: {result.get('document_id')}")
        print(f"Complete: {result.get('complete')}")
        print("\nDocument Content:")
        print(result.get('document_content', ''))
    
    asyncio.run(test_agent())