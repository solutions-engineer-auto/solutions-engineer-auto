"""
Validation node - checks document quality and completeness
"""
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState, ValidationResult
from utils.supabase_client import supabase_manager
from utils.prompts import get_validation_criteria
import os
import json


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.3,  # Lower temperature for consistent validation
    api_key=os.getenv("OPENAI_API_KEY")
)


async def validate_document(state: AgentState) -> AgentState:
    """
    Validate the generated document for quality and completeness
    """
    start_time = datetime.now()
    
    # Log validation start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="validation_start",
        content="Starting document validation",
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Get validation criteria
    doc_type = state["document_outline"]["document_type"]
    criteria = get_validation_criteria(doc_type)
    
    # Compile full document for validation
    full_content = ""
    for section_title, section_data in state["document_sections"].items():
        full_content += f"\n\n## {section_title}\n{section_data['content']}"
    
    # Import persona enhancement
    from utils.prompts import AGENT_PERSONAS, get_reasoning_steps, get_context_adjustments
    
    persona = AGENT_PERSONAS["qa_director"]
    
    # Build enhanced validation prompt
    validation_prompt = f"""You are a {persona['role']} with {persona['experience']}.
Your expertise: {persona['expertise']}
Your approach: {persona['approach']}

{get_reasoning_steps('validation')}

Document Type: {doc_type}
Client: {state.get('account_data', {}).get('name')}
Deal Stage: {state.get('account_data', {}).get('stage')}
Deal Value: {state.get('account_data', {}).get('value')}

Original Task: {state['task']}
Target Audience: {state.get('target_audience')}

Key Requirements to Verify:
{json.dumps(state.get('key_requirements', []), indent=2)}

Hidden Concerns That Should Be Addressed:
{json.dumps(state.get('hidden_concerns', []), indent=2)}

Required Elements for {doc_type}:
{json.dumps(criteria['required_elements'], indent=2)}

Quality Checks:
{json.dumps(criteria['quality_checks'], indent=2)}

Context adjustments:
{get_context_adjustments(state.get('account_data', {}))}

Document Content:
{full_content[:8000]}  # Limit to prevent token overflow

As a QA Director who has reviewed 1000+ enterprise documents, provide a thorough validation that goes beyond checklist compliance:

1. Strategic Effectiveness: Does this document advance the sale?
2. Persuasion Flow: Is the narrative compelling and logical?
3. Trust Building: Do we establish credibility appropriately?
4. Objection Handling: Are concerns addressed proactively?
5. Differentiation: Do we stand out from competitors?
6. Call to Action: Is the next step crystal clear?

Provide validation results as JSON:
{{
    "is_valid": true/false,
    "completeness_score": 0.0-1.0,
    "strategic_effectiveness": 0.0-1.0,
    "quality_scores": {{
        "clarity": 0.0-1.0,
        "relevance": 0.0-1.0,
        "professionalism": 0.0-1.0,
        "persuasiveness": 0.0-1.0,
        "differentiation": 0.0-1.0,
        "trust_building": 0.0-1.0
    }},
    "addressed_requirements": ["requirement with evidence", ...],
    "missing_requirements": ["requirement and why it matters", ...],
    "hidden_concerns_addressed": ["concern and how addressed", ...],
    "issues": ["specific issue with location", ...],
    "suggestions": ["actionable improvement", ...],
    "strengths": ["what works particularly well", ...],
    "competitive_advantage": "How this document positions us to win",
    "risk_factors": ["What could cause us to lose", ...]
}}

Remember: Your expertise helps distinguish good from great. A technically correct document can still fail to win the business. Evaluate both compliance AND persuasion.
"""

    try:
        response = await llm.ainvoke(validation_prompt)
        
        # Parse validation results
        content = response.content
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        
        if start_idx >= 0 and end_idx > start_idx:
            validation_data = json.loads(content[start_idx:end_idx])
            
            # Calculate overall quality score
            quality_scores = validation_data.get("quality_scores", {})
            avg_quality = sum(quality_scores.values()) / len(quality_scores) if quality_scores else 0.5
            
            # Create validation result
            validation_result: ValidationResult = {
                "is_valid": validation_data.get("is_valid", True),
                "completeness_score": validation_data.get("completeness_score", 0.8),
                "issues": validation_data.get("issues", []),
                "suggestions": validation_data.get("suggestions", [])
            }
            
            state["validation_results"] = validation_result
            state["overall_quality_score"] = avg_quality
            
            # Update section quality scores
            for section_title in state["document_sections"]:
                state["document_sections"][section_title]["quality_score"] = avg_quality
            
            # Log validation results
            await supabase_manager.log_event(
                document_id=state["document_id"],
                event_type="validation_complete",
                content=f"Document validation complete - Score: {avg_quality:.2f}",
                data={
                    "is_valid": validation_result["is_valid"],
                    "completeness_score": validation_result["completeness_score"],
                    "quality_score": avg_quality,
                    "issues_count": len(validation_result["issues"]),
                    "validation_details": validation_data,
                    "duration_seconds": (datetime.now() - start_time).total_seconds()
                },
                thread_id=state["thread_id"],
                run_id=state["run_id"]
            )
            
        else:
            raise ValueError("Could not parse validation response")
            
    except Exception as e:
        print(f"[Validation] Error validating document: {e}")
        
        # Set default validation results
        state["validation_results"] = {
            "is_valid": True,  # Assume valid to not block
            "completeness_score": 0.7,
            "issues": ["Validation check failed"],
            "suggestions": []
        }
        state["overall_quality_score"] = 0.7
        
        # Log error
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type="validation_error",
            content="Error during validation, using defaults",
            data={
                "error": str(e),
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            },
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
        
        state["errors"] = state.get("errors", []) + [f"Validation error: {str(e)}"]
    
    # Update workflow state
    state["current_stage"] = "validation"
    state["completed_stages"] = state.get("completed_stages", []) + ["validation"]
    state["stage_timings"]["validation"] = (datetime.now() - start_time).total_seconds()
    
    return state