"""
Document Generation Agent for LangGraph Cloud
This module exports the compiled graph for deployment
"""

import os
from typing import TypedDict, List, Dict, Any, Literal
from datetime import datetime
import uuid
import json

from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage

# Initialize LLM
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4"),
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY")
)


# Define the agent state
class AgentState(TypedDict):
    task: str
    gathered_info: Dict[str, Any]
    document_sections: List[Dict[str, str]]
    outline: List[str]
    current_section: int
    human_feedback: str
    approved: bool
    complete: bool
    subtasks: List[Dict[str, Any]]
    messages: List[Any]
    token_count: int
    confidence_score: float
    next_action: str
    ready_for_review: bool
    # New fields for document generation
    document_id: str
    document_content: str
    account_data: Dict[str, Any]


# Tool implementations
async def search_embeddings(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search for relevant documents in knowledge base"""
    # In production, this would connect to Supabase
    # For now, return mock data based on query
    
    mock_results = []
    
    if "aws" in query.lower() or "cloud" in query.lower():
        mock_results.append({
            "id": "doc_001",
            "title": "AWS Migration Best Practices",
            "content": "Our standard approach for AWS migrations includes: 1) Assessment phase, 2) Planning phase, 3) Migration execution, 4) Optimization phase.",
            "relevance_score": 0.95
        })
    
    if "retail" in query.lower():
        mock_results.append({
            "id": "doc_002",
            "title": "Retail Digital Transformation Case Study",
            "content": "Successfully migrated RetailCo's e-commerce platform to AWS, resulting in 40% cost reduction.",
            "relevance_score": 0.88
        })
    
    if "security" in query.lower():
        mock_results.append({
            "id": "doc_003",
            "title": "Security Assessment Template",
            "content": "Standard security assessment covers: Network security, IAM, Data encryption, Compliance requirements.",
            "relevance_score": 0.92
        })
    
    return mock_results[:limit]


async def fetch_client_info(state: AgentState) -> Dict[str, Any]:
    """Fetch client information from state or database"""
    # First check if we have account data in state
    if state.get("account_data"):
        return state["account_data"]
    
    # Otherwise use mock implementation - replace with Supabase query later
    client_name = state.get("task", "Unknown Client")
    if "acme" in client_name.lower():
        return {
            "name": "Acme Corp",
            "industry": "Retail",
            "size": "Enterprise",
            "previous_projects": ["POS System Upgrade", "Inventory Management"],
            "key_contacts": ["John Smith (CTO)", "Jane Doe (VP Engineering)"]
        }
    
    return {
        "name": client_name,
        "industry": "Technology",
        "size": "Enterprise"
    }


async def generate_content(template: str, context: Dict[str, Any]) -> str:
    """Generate content for a document section"""
    prompt = f"""Generate a professional document section for: {template}

Context information:
{json.dumps(context, indent=2)}

Write a concise, professional section that would fit in a business proposal.
Include specific details from the context where relevant.
Keep it to 2-3 paragraphs."""

    response = llm.invoke(prompt)
    return response.content


# Meta tools
async def create_subtasks(main_task: str, context: Dict[str, Any]) -> List[Dict[str, str]]:
    """Break down the main task into subtasks"""
    prompt = f"""Break down this document generation task into 4-6 specific subtasks:
Task: {main_task}

Format each subtask as a clear action item.
Include tasks for research, planning, writing, and review."""

    response = llm.invoke(prompt)
    
    subtasks = []
    for line in response.content.split('\n'):
        if line.strip() and not line.startswith('Format'):
            subtasks.append({
                "task": line.strip().lstrip('0123456789.- '),
                "status": "pending"
            })
    
    return subtasks[:6]


async def evaluate_progress(state: AgentState) -> Dict[str, Any]:
    """Evaluate agent progress"""
    total_sections = len(state.get("outline", []))
    completed_sections = len(state.get("document_sections", []))
    
    progress = (completed_sections / max(total_sections, 1)) * 100
    
    confidence = 0.5
    if state.get("gathered_info"):
        confidence += 0.2
    if completed_sections > 0:
        confidence += 0.3
    
    return {
        "progress_percentage": progress,
        "sections_completed": completed_sections,
        "sections_total": total_sections,
        "confidence_score": confidence
    }


# Node functions
async def agent_decide(state: AgentState) -> AgentState:
    """OBSERVE & ORIENT phases - analyze current state and decide next action"""
    
    if state.get("complete"):
        return state
    
    if state.get("human_feedback") and not state.get("approved"):
        state["next_action"] = "PROCESS_FEEDBACK"
        return state
    
    if not state.get("subtasks"):
        subtasks = await create_subtasks(state["task"], state.get("gathered_info", {}))
        state["subtasks"] = subtasks
    
    progress = await evaluate_progress(state)
    
    # Decision logic
    gathered_info = state.get("gathered_info", {})
    sections = state.get("document_sections", [])
    outline = state.get("outline", [])
    
    if not gathered_info:
        state["next_action"] = "SEARCH"
    elif not outline:
        state["next_action"] = "OUTLINE"
    elif len(sections) < len(outline):
        state["next_action"] = "GENERATE"
    else:
        state["next_action"] = "REVIEW"
    
    return state


async def execute_tool(state: AgentState) -> AgentState:
    """DECIDE & ACT phases - execute the chosen tool"""
    
    action = state.get("next_action", "")
    
    # Initialize document if needed
    if not state.get("document_id"):
        # For now, use mock document ID - will create in Supabase later
        state["document_id"] = f"doc-{uuid.uuid4().hex[:8]}"
        state["document_content"] = ""
        print(f"[MOCK] Would create document in Supabase with ID: {state['document_id']}")
    
    if action == "SEARCH":
        # Extract search terms from task
        task_lower = state["task"].lower()
        search_queries = []
        
        if "proposal" in task_lower:
            search_queries.append("proposal template")
        if "aws" in task_lower or "cloud" in task_lower:
            search_queries.append("aws migration")
        if "retail" in task_lower:
            search_queries.append("retail client")
        if "security" in task_lower:
            search_queries.append("security assessment")
        
        # Extract client name
        client_name = ""
        if "for" in task_lower:
            parts = task_lower.split("for")
            if len(parts) > 1:
                client_words = parts[1].strip().split()
                if client_words:
                    client_name = " ".join(client_words[:2])
        
        # Perform searches
        all_results = {}
        for query in search_queries:
            results = await search_embeddings(query)
            all_results[query] = results
        
        if client_name or state.get("account_data"):
            client_info = await fetch_client_info(state)
            all_results["client_info"] = client_info
        
        if "gathered_info" not in state:
            state["gathered_info"] = {}
        state["gathered_info"].update(all_results)
        
    elif action == "OUTLINE":
        # Generate outline
        outline_prompt = f"""Create a document outline for: {state['task']}

Based on this information:
{json.dumps(state.get('gathered_info', {}), indent=2)}

Generate 5-7 main sections. Return just section titles, one per line."""

        response = llm.invoke(outline_prompt)
        outline = [line.strip() for line in response.content.split('\n') if line.strip()]
        state["outline"] = outline[:7]
        state["current_section"] = 0
        
        # Initialize document with title
        doc_title = state.get('task', 'Document').replace('Generate ', '').replace('Create ', '')
        state["document_content"] = f"# {doc_title}\n\n"
        
    elif action == "GENERATE":
        # Generate next section
        if "outline" in state and state.get("current_section", 0) < len(state["outline"]):
            section_title = state["outline"][state["current_section"]]
            
            section_context = {
                "task": state["task"],
                "section_title": section_title,
                "previous_sections": [s["title"] for s in state.get("document_sections", [])],
                "gathered_info": state.get("gathered_info", {})
            }
            
            content = await generate_content(section_title, section_context)
            
            if "document_sections" not in state:
                state["document_sections"] = []
            
            state["document_sections"].append({
                "title": section_title,
                "content": content,
                "generated_at": datetime.now().isoformat()
            })
            
            # Append to document content
            state["document_content"] += f"## {section_title}\n\n{content}\n\n"
            
            # Mock Supabase update - will replace with real update later
            print(f"[MOCK] Would update document {state['document_id']} in Supabase")
            print(f"[MOCK] Document now has {len(state['document_sections'])} sections")
            
            state["current_section"] = state.get("current_section", 0) + 1
            
            if state["current_section"] >= len(state["outline"]):
                state["ready_for_review"] = True
                
    elif action == "REVIEW":
        # When all sections are complete and ready for review
        # Mark as complete for the initial generation
        state["complete"] = True
        state["approved"] = True
        state["ready_for_review"] = True
        
        # Add a summary section
        state["document_content"] += "\n---\n\n*Document generated successfully. Ready for review and feedback.*\n"
        
        print(f"[MOCK] Document {state['document_id']} generation complete")
        
    elif action == "PROCESS_FEEDBACK":
        # Process human feedback by regenerating or modifying sections
        feedback = state.get("human_feedback", "")
        
        # Analyze feedback and modify document
        if "regenerate" in feedback.lower():
            # Reset to regenerate all sections
            state["document_sections"] = []
            state["current_section"] = 0
            state["document_content"] = f"# {state.get('task', 'Document')}\n\n"
        elif feedback:
            # Use feedback to refine the document
            refine_prompt = f"""Current document content:
{state.get('document_content', '')}

User feedback: {feedback}

Revise the document based on this feedback. Return the complete updated document."""
            
            response = llm.invoke(refine_prompt)
            state["document_content"] = response.content
            
            # Mock Supabase update
            print(f"[MOCK] Would update document {state['document_id']} with refined content")
            
            state["approved"] = True
            state["complete"] = True
        else:
            # Mark as approved if no specific feedback
            state["approved"] = True
            state["complete"] = True
    
    return state


async def human_review(state: AgentState) -> AgentState:
    """Human review checkpoint - in production, this waits for external input"""
    # In cloud deployment, this node would be an interrupt point
    # The state would be persisted and the agent would wait for user input
    
    # For cloud deployment, we just mark that we're ready for review
    # The actual review happens through the API
    state["ready_for_review"] = True
    
    # FIXED: For initial document generation, also mark as complete
    # to avoid infinite loop when there's no human feedback yet
    if not state.get("human_feedback"):
        state["complete"] = True
        state["approved"] = True
        print("[human_review] No feedback yet, marking as complete to avoid recursion")
    
    return state


# Build and export the graph
def build_graph():
    """Build the agent graph"""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("decide", agent_decide)
    workflow.add_node("execute", execute_tool)
    workflow.add_node("human_review", human_review)
    
    # Set entry point
    workflow.set_entry_point("decide")
    
    # Add edges
    workflow.add_edge("decide", "execute")
    
    # Conditional routing
    def should_continue(state):
        if state.get("ready_for_review") and not state.get("approved"):
            return "human_review"
        elif state.get("complete"):
            return END
        else:
            return "decide"
    
    workflow.add_conditional_edges(
        "execute",
        should_continue,
        {
            "decide": "decide",
            "human_review": "human_review",
            END: END
        }
    )
    
    # From human review, either continue or end
    def after_review(state):
        if state.get("approved") or state.get("complete"):
            return END
        else:
            return "decide"
    
    workflow.add_conditional_edges(
        "human_review",
        after_review,
        {
            "decide": "decide",
            END: END
        }
    )
    
    return workflow


# Create and compile the graph for export
workflow = build_graph()

# Compile with interrupt before human review
graph = workflow.compile(
    interrupt_before=["human_review"]
)

# This is what LangGraph Cloud will import
__all__ = ["graph"]