"""
Context analysis node - analyzes requirements and determines document type
"""
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState
from utils.supabase_client import supabase_manager
import os
import json


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.4,
    api_key=os.getenv("OPENAI_API_KEY")
)


async def analyze_context(state: AgentState) -> AgentState:
    """
    Analyze the task and context to extract requirements and determine document type
    """
    start_time = datetime.now()
    
    # Log analysis start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="analysis_start",
        content="Analyzing task requirements and context",
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Build context for analysis
    account_data = state.get("account_data") or {}
    context_info = f"""
Task: {state["task"]}

Client Information:
- Name: {account_data.get("name", "Unknown")}
- Stage: {account_data.get("stage", "Unknown")}
- Value: {account_data.get("value", "Unknown")}
- Contact: {account_data.get("contact", "Unknown")}

Additional Context:
{json.dumps(account_data, indent=2)}
"""

    if state.get("selected_context"):
        context_info += f"\n\nRelevant Documents Found:\n{state['selected_context']}"
    
    # Import persona enhancement
    from utils.prompts import AGENT_PERSONAS, get_reasoning_steps, get_context_adjustments, get_few_shot_examples
    
    persona = AGENT_PERSONAS["business_analyst"]
    
    # Analyze requirements with enhanced prompt
    analysis_prompt = f"""You are a {persona['role']} with {persona['experience']}.
Your expertise: {persona['expertise']}
Your approach: {persona['approach']}

{get_reasoning_steps('analysis')}

{get_few_shot_examples('requirement_extraction')}

Context for analysis:
{context_info}

Context adjustments:
{get_context_adjustments(account_data)}

Drawing on your experience as a former CTO, provide a comprehensive analysis:

1. Document Type: What type of document will best serve this client's needs? (proposal, rfp_response, technical_architecture, poc_plan, business_case, or other)
2. Target Audience: Who are ALL the stakeholders? (technical evaluators, business decision makers, procurement, legal, end users)
3. Key Requirements: List 5-7 SPECIFIC requirements, including both stated and inferred needs
4. Hidden Concerns: What unspoken worries might stakeholders have?
5. Success Criteria: What specific, measurable outcomes define success?
6. Recommended Tone: How should we communicate given their culture and stage?
7. Strategic Positioning: How do we differentiate from likely competitors?

Return your analysis as a JSON object with these fields:
{{
    "document_type": "string",
    "target_audience": "string (be specific about roles and concerns)",
    "key_requirements": ["specific requirement with success metric", ...],
    "hidden_concerns": ["unstated worry or risk", ...],
    "success_criteria": ["measurable outcome", ...],
    "tone_recommendations": "string with specific guidance",
    "strategic_positioning": "how to win against competition",
    "additional_insights": "other strategic observations"
}}

Remember: Your 20 years of experience helps you see what others miss. Look for the real business drivers behind the technical requirements.
"""

    try:
        response = await llm.ainvoke(analysis_prompt)
        
        # Parse the analysis
        content = response.content
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            analysis = json.loads(content[start_idx:end_idx])
            
            # Update state with analysis results
            state["document_outline"] = {
                "document_type": analysis.get("document_type", "proposal"),
                "sections": [],  # Will be populated in planning node
                "estimated_length": 0,
                "key_points": analysis.get("key_requirements", [])
            }
            
            state["target_audience"] = analysis.get("target_audience", "General audience")
            state["key_requirements"] = analysis.get("key_requirements", [])
            
            # Log successful analysis
            await supabase_manager.log_event(
                document_id=state["document_id"],
                event_type="analysis_complete",
                content="Successfully analyzed task requirements",
                data={
                    "document_type": analysis.get("document_type"),
                    "target_audience": analysis.get("target_audience"),
                    "requirements_count": len(analysis.get("key_requirements", [])),
                    "analysis_results": analysis,
                    "duration_seconds": (datetime.now() - start_time).total_seconds()
                },
                thread_id=state["thread_id"],
                run_id=state["run_id"]
            )
            
        else:
            raise ValueError("Could not parse analysis response")
            
    except Exception as e:
        print(f"[Analysis] Error analyzing context: {e}")
        
        # Set defaults on error
        state["document_outline"] = {
            "document_type": "proposal",
            "sections": [],
            "estimated_length": 0,
            "key_points": []
        }
        state["target_audience"] = "General business audience"
        state["key_requirements"] = [
            "Address the stated task",
            "Provide clear recommendations",
            "Include implementation details",
            "Consider budget and timeline",
            "Identify risks and mitigation"
        ]
        
        # Log error
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type="analysis_error",
            content="Error during context analysis, using defaults",
            data={
                "error": str(e),
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            },
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
        
        state["errors"] = state.get("errors", []) + [f"Analysis error: {str(e)}"]
    
    # Update workflow state
    state["current_stage"] = "analysis"
    state["completed_stages"] = state.get("completed_stages", []) + ["analysis"]
    state["stage_timings"]["analysis"] = (datetime.now() - start_time).total_seconds()
    
    return state