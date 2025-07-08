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


async def fetch_client_info(client_name: str) -> Dict[str, Any]:
    """Fetch client information from database"""
    # Mock implementation - replace with Supabase query
    if client_name.lower() == "acme corp":
        return {
            "name": "Acme Corp",
            "industry": "Retail",
            "size": "Enterprise",
            "previous_projects": ["POS System Upgrade", "Inventory Management"],
            "key_contacts": ["John Smith (CTO)", "Jane Doe (VP Engineering)"]
        }
    
    return {
        "name": client_name,
        "industry": "Unknown",
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
        
        if client_name:
            client_info = await fetch_client_info(client_name)
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
            
            state["current_section"] = state.get("current_section", 0) + 1
            
            if state["current_section"] >= len(state["outline"]):
                state["ready_for_review"] = True
                
    elif action == "REVIEW":
        state["ready_for_review"] = True
        
    elif action == "PROCESS_FEEDBACK":
        # Process human feedback by regenerating or modifying sections
        feedback = state.get("human_feedback", "")
        
        # Simple implementation - in production, would be more sophisticated
        if "regenerate" in feedback.lower():
            # Reset to regenerate all sections
            state["document_sections"] = []
            state["current_section"] = 0
        else:
            # Mark as approved if no specific regeneration requested
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