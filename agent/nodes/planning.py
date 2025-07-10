"""
Document planning node - creates detailed outline based on requirements
"""
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState
from utils.prompts import AGENT_PERSONAS, get_reasoning_steps, get_context_adjustments
from utils.supabase_client import supabase_manager
from constants.events import EventTypes
import os
import json


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.5,
    api_key=os.getenv("OPENAI_API_KEY")
)


async def plan_document(state: AgentState) -> AgentState:
    """
    Create a detailed document outline based on analysis
    """
    start_time = datetime.now()
    
    # Log planning start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.PLANNING_STARTED,
        content="Creating detailed document outline",
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Get document type from analysis
    doc_type = state.get("document_outline", {}).get("document_type", "custom")
    
    persona = AGENT_PERSONAS["solutions_architect"]
    
    # Build enhanced planning prompt - fully dynamic based on user's task
    planning_prompt = f"""You are a {persona['role']} with {persona['experience']}.
Your expertise: {persona['expertise']}
Your approach: {persona['approach']}

{get_reasoning_steps('planning')}

Your task is to create a completely custom document outline based ENTIRELY on the user's specific request. 
Do not use any predefined templates - let the user's needs drive the structure.

User's Request: {state['task']}

Document Type Identified: {doc_type}
Target Audience: {state.get('target_audience', 'To be determined from the request')}

Key Requirements to Address:
{json.dumps(state.get('key_requirements', []), indent=2)}

Hidden Concerns to Address:
{json.dumps(state.get('hidden_concerns', []), indent=2)}

Strategic Positioning:
{state.get('strategic_positioning', 'Tailor to the specific request')}

Client Context:
- Name: {state.get('account_data', {}).get('name')}
- Stage: {state.get('account_data', {}).get('stage')}
- Value: {state.get('account_data', {}).get('value')}
- Contact: {state.get('account_data', {}).get('contact')}

Context adjustments:
{get_context_adjustments(state.get("account_data", {}))}

IMPORTANT: Create a document outline that DIRECTLY addresses what the user is asking for. The structure should be:
- Completely driven by the user's specific request
- Not constrained by any standard template
- Organized to best serve the user's stated goal
- Flexible in length and depth based on what's needed

As an architect who has designed 200+ winning documents, create a strategic outline that:

1. Directly addresses every aspect of the user's request
2. Uses section titles that clearly relate to what the user asked for
3. Includes the right level of detail for the user's needs
4. Focuses on delivering exactly what was requested

For each section, provide:
- A clear, relevant title that relates to the user's request
- 3-5 key points that need to be covered
- Strategic purpose (why this section helps achieve the user's goal)
- Any specific elements requested by the user
- Diagram opportunities (where visual representation would enhance understanding)

Return the outline as a JSON object:
{{
    "sections": [
        {{
            "title": "Clear section title relevant to user's request",
            "key_points": ["specific point to cover", ...],
            "strategic_purpose": "How this section serves the user's goal",
            "proof_elements": ["any evidence or examples needed"],
            "estimated_words": 300,
            "priority": "required|optional",
            "diagram_opportunities": ["flowchart for process steps", "architecture diagram for system design", "timeline for implementation phases"]
        }},
        ...
    ],
    "total_estimated_words": 2000,
    "narrative_arc": "How the document flows to achieve the user's objective",
    "key_differentiators": ["What makes this approach effective"],
    "special_considerations": ["Any specific requirements from the user's request"]
}}

Remember: The user's request is your north star. Every section should clearly contribute to fulfilling what they asked for.
"""

    try:
        response = await llm.ainvoke(planning_prompt)
        
        # Parse the outline
        content = response.content
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            outline = json.loads(content[start_idx:end_idx])
            
            # Update state with detailed outline
            state["document_outline"]["sections"] = outline.get("sections", [])
            state["document_outline"]["estimated_length"] = outline.get("total_estimated_words", 2000)
            
            # Initialize document sections dictionary
            state["document_sections"] = {}
            
            # Log successful planning
            await supabase_manager.log_event(
                document_id=state["document_id"],
                event_type=EventTypes.PLANNING_COMPLETED,
                content=f"Created outline with {len(outline.get('sections', []))} sections",
                data={
                    "sections_count": len(outline.get("sections", [])),
                    "estimated_length": outline.get("total_estimated_words", 2000)
                },
                thread_id=state["thread_id"],
                run_id=state["run_id"]
            )
            
        else:
            raise ValueError("Could not parse outline response")
            
    except Exception as e:
        # Log error but continue with fallback outline
        import traceback
        traceback.print_exc()
        
        # Log planning failure
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type=EventTypes.PLANNING_FAILED,
            content=f"Planning failed, using fallback outline: {str(e)}",
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
        
        # Create a minimal fallback outline based on the user's request
        fallback_sections = [
            {
                "title": "Introduction",
                "key_points": ["Overview of the document purpose", "Key objectives"],
                "strategic_purpose": "Set context for the reader",
                "proof_elements": [],
                "estimated_words": 300,
                "priority": "required"
            },
            {
                "title": "Main Content",
                "key_points": ["Core information requested by user", "Detailed analysis"],
                "strategic_purpose": "Deliver the main value",
                "proof_elements": [],
                "estimated_words": 1000,
                "priority": "required"
            },
            {
                "title": "Conclusion and Next Steps",
                "key_points": ["Summary of key points", "Recommended actions"],
                "strategic_purpose": "Provide clear takeaways",
                "proof_elements": [],
                "estimated_words": 300,
                "priority": "required"
            }
        ]
        
        state["document_outline"]["sections"] = fallback_sections
        state["document_outline"]["estimated_length"] = 1600
        state["document_sections"] = {}
        
        
        state["errors"] = state.get("errors", []) + [f"Planning error: {str(e)}"]
    
    # Update workflow state
    state["current_stage"] = "planning"
    state["completed_stages"] = state.get("completed_stages", []) + ["planning"]
    state["stage_timings"]["planning"] = (datetime.now() - start_time).total_seconds()
    
    return state