"""
Document planning node - creates detailed outline based on requirements
"""
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState
from utils.supabase_client import supabase_manager
import os
import json


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.5,
    api_key=os.getenv("OPENAI_API_KEY")
)


# Document templates for different types
DOCUMENT_TEMPLATES = {
    "proposal": {
        "sections": [
            {"title": "Executive Summary", "priority": "required", "est_words": 300},
            {"title": "Introduction", "priority": "required", "est_words": 200},
            {"title": "Understanding Your Requirements", "priority": "required", "est_words": 400},
            {"title": "Proposed Solution", "priority": "required", "est_words": 800},
            {"title": "Implementation Approach", "priority": "required", "est_words": 600},
            {"title": "Timeline and Milestones", "priority": "required", "est_words": 400},
            {"title": "Investment and ROI", "priority": "required", "est_words": 500},
            {"title": "Why Choose Us", "priority": "optional", "est_words": 300},
            {"title": "Next Steps", "priority": "required", "est_words": 200}
        ]
    },
    "rfp_response": {
        "sections": [
            {"title": "Executive Summary", "priority": "required", "est_words": 400},
            {"title": "Company Overview", "priority": "required", "est_words": 300},
            {"title": "Understanding of Requirements", "priority": "required", "est_words": 500},
            {"title": "Technical Solution", "priority": "required", "est_words": 1000},
            {"title": "Project Management Approach", "priority": "required", "est_words": 500},
            {"title": "Team and Qualifications", "priority": "required", "est_words": 400},
            {"title": "References and Case Studies", "priority": "optional", "est_words": 400},
            {"title": "Pricing", "priority": "required", "est_words": 300},
            {"title": "Terms and Conditions", "priority": "optional", "est_words": 200}
        ]
    },
    "technical_architecture": {
        "sections": [
            {"title": "Overview", "priority": "required", "est_words": 300},
            {"title": "Current State Analysis", "priority": "required", "est_words": 500},
            {"title": "Proposed Architecture", "priority": "required", "est_words": 800},
            {"title": "Technology Stack", "priority": "required", "est_words": 400},
            {"title": "Security Considerations", "priority": "required", "est_words": 500},
            {"title": "Scalability and Performance", "priority": "required", "est_words": 400},
            {"title": "Integration Points", "priority": "optional", "est_words": 300},
            {"title": "Migration Strategy", "priority": "optional", "est_words": 400},
            {"title": "Risk Assessment", "priority": "required", "est_words": 300}
        ]
    },
    "poc_plan": {
        "sections": [
            {"title": "POC Objectives", "priority": "required", "est_words": 300},
            {"title": "Scope and Limitations", "priority": "required", "est_words": 400},
            {"title": "Technical Approach", "priority": "required", "est_words": 600},
            {"title": "Success Criteria", "priority": "required", "est_words": 300},
            {"title": "Timeline", "priority": "required", "est_words": 200},
            {"title": "Resources Required", "priority": "required", "est_words": 300},
            {"title": "Evaluation Process", "priority": "required", "est_words": 400}
        ]
    }
}


async def plan_document(state: AgentState) -> AgentState:
    """
    Create a detailed document outline based on analysis
    """
    start_time = datetime.now()
    
    # Log planning start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="planning_start",
        content="Creating document outline",
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Get document type and template
    doc_type = state.get("document_outline", {}).get("document_type", "proposal")
    template = DOCUMENT_TEMPLATES.get(doc_type, DOCUMENT_TEMPLATES["proposal"])
    
    # Import persona enhancement
    from utils.prompts import AGENT_PERSONAS, get_reasoning_steps, get_context_adjustments
    
    persona = AGENT_PERSONAS["solutions_architect"]
    
    # Build enhanced planning prompt
    planning_prompt = f"""You are a {persona['role']} with {persona['experience']}.
Your expertise: {persona['expertise']}
Your approach: {persona['approach']}

{get_reasoning_steps('planning')}

Document Type: {doc_type}
Target Audience: {state.get('target_audience', 'General business audience')}

Key Requirements to Address:
{json.dumps(state.get('key_requirements', []), indent=2)}

Hidden Concerns to Address:
{json.dumps(state.get('hidden_concerns', []), indent=2)}

Strategic Positioning:
{state.get('strategic_positioning', 'Differentiate through value and expertise')}

Client Context:
- Name: {state.get('account_data', {}).get('name')}
- Stage: {state.get('account_data', {}).get('stage')}
- Value: {state.get('account_data', {}).get('value')}
- Contact: {state.get('account_data', {}).get('contact')}

Task: {state['task']}

Base Template Sections:
{json.dumps(template['sections'], indent=2)}

Context adjustments:
{get_context_adjustments(state.get("account_data", {}))}

As an architect who has designed 200+ winning proposals, create a strategic document outline that:

1. Builds trust progressively (establish credibility early)
2. Addresses hidden concerns naturally within the flow
3. Creates "aha moments" where the client sees new possibilities
4. Uses section titles that speak to outcomes, not features
5. Sequences information to overcome objections before they arise
6. Includes proof points at critical junctures

For each section, provide:
- A compelling, outcome-focused title
- 3-5 key points that advance the narrative
- Strategic purpose (why this section at this point)
- Proof elements (case studies, metrics, testimonials)

Return the outline as a JSON object:
{{
    "sections": [
        {{
            "title": "Outcome-focused section title",
            "key_points": ["strategic point that advances the sale", ...],
            "strategic_purpose": "Why this section appears here",
            "proof_elements": ["specific evidence to include"],
            "estimated_words": 300,
            "priority": "required|optional"
        }},
        ...
    ],
    "total_estimated_words": 3000,
    "narrative_arc": "Description of how the document builds to a compelling conclusion",
    "key_differentiators": ["How we stand out from competitors"],
    "special_considerations": ["Client-specific adaptations"]
}}

Remember: Your 85% win rate comes from understanding that document structure is persuasion architecture. Design accordingly.
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
            state["document_outline"]["sections"] = outline.get("sections", template["sections"])
            state["document_outline"]["estimated_length"] = outline.get("total_estimated_words", 3000)
            
            # Initialize document sections dictionary
            state["document_sections"] = {}
            
            # Log successful planning
            await supabase_manager.log_event(
                document_id=state["document_id"],
                event_type="planning_complete",
                content=f"Created outline with {len(outline.get('sections', []))} sections",
                data={
                    "sections_count": len(outline.get('sections', [])),
                    "estimated_words": outline.get("total_estimated_words"),
                    "outline": outline,
                    "duration_seconds": (datetime.now() - start_time).total_seconds()
                },
                thread_id=state["thread_id"],
                run_id=state["run_id"]
            )
            
        else:
            raise ValueError("Could not parse outline response")
            
    except Exception as e:
        print(f"[Planning] Error creating outline: {e}")
        
        # Use template as fallback
        state["document_outline"]["sections"] = template["sections"]
        state["document_outline"]["estimated_length"] = sum(
            s.get("est_words", 300) for s in template["sections"]
        )
        state["document_sections"] = {}
        
        # Log error
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type="planning_error",
            content="Error creating custom outline, using template",
            data={
                "error": str(e),
                "fallback_template": doc_type,
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            },
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
        
        state["errors"] = state.get("errors", []) + [f"Planning error: {str(e)}"]
    
    # Update workflow state
    state["current_stage"] = "planning"
    state["completed_stages"] = state.get("completed_stages", []) + ["planning"]
    state["stage_timings"]["planning"] = (datetime.now() - start_time).total_seconds()
    
    return state