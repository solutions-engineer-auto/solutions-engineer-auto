"""
Section generation node - generates document sections sequentially
"""
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState, DocumentSection
from utils.supabase_client import supabase_manager
from utils.prompts import get_section_prompt
import os


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY")
)


async def generate_section(
    section_info: dict,
    state: AgentState,
    previous_sections: dict
) -> DocumentSection:
    """Generate a single section of the document"""
    
    # Build context from previous sections
    previous_content = ""
    if previous_sections:
        previous_content = "\n\nPrevious sections for context:\n"
        for title, section in previous_sections.items():
            previous_content += f"\n### {title}\n{section['content'][:500]}...\n"
    
    # Import enhanced prompts
    from utils.prompts import get_section_prompt, get_context_adjustments, get_few_shot_examples
    
    # Get the specialized prompt for this section type
    enhanced_section_prompt = get_section_prompt(section_info.get('title'), state.get('account_data', {}))
    
    # Build the generation prompt with persona
    generation_prompt = f"""{enhanced_section_prompt}

Client: {state.get('account_data', {}).get('name')}
Target Audience: {state.get('target_audience')}
Client Stage: {state.get('account_data', {}).get('stage')}
Deal Value: {state.get('account_data', {}).get('value')}

Current Section: {section_info.get('title')}
Strategic Purpose: {section_info.get('strategic_purpose', 'Advance the narrative')}
Key Points to Cover: {section_info.get('key_points', [])}
Proof Elements to Include: {section_info.get('proof_elements', [])}
Target Length: {section_info.get('estimated_words', 300)} words

Context from Task: {state['task']}

Requirements to Address in this Section:
{[req for req in state.get('key_requirements', []) if any(keyword in req.lower() for keyword in section_info.get('title', '').lower().split())]}

Hidden Concerns to Subtly Address:
{state.get('hidden_concerns', [])}
{previous_content}

Retrieved Context (if relevant to this section):
{(state.get('selected_context') or 'No additional context available')[:1500]}

Context adjustments:
{get_context_adjustments(state.get('account_data', {}))}

{get_few_shot_examples('value_proposition')}

Write this section to:
1. Speak directly to {state.get('target_audience')}'s priorities
2. Use {state.get('account_data', {}).get('name')}'s industry language
3. Include specific metrics and outcomes where possible
4. Build on the narrative from previous sections
5. Pre-empt objections with evidence
6. Create moments of recognition ("yes, that's exactly our challenge")

Format: Use markdown with compelling subheadings that draw the reader forward.

Remember: Every sentence should either build trust, demonstrate value, or advance toward the close.
"""

    try:
        response = await llm.ainvoke(generation_prompt)
        content = response.content
        word_count = len(content.split())
        
        return {
            "title": section_info.get('title'),
            "content": content,
            "quality_score": None,  # Will be set in validation
            "word_count": word_count,
            "generated_at": datetime.now()
        }
        
    except Exception as e:
        print(f"[Generation] Error generating section {section_info.get('title')}: {e}")
        return {
            "title": section_info.get('title'),
            "content": f"[Error generating this section: {str(e)}]",
            "quality_score": 0.0,
            "word_count": 0,
            "generated_at": datetime.now()
        }


async def generate_sections(state: AgentState) -> AgentState:
    """
    Generate all document sections sequentially
    """
    start_time = datetime.now()
    
    # Log generation start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="generation_start",
        content="Starting section-by-section generation",
        data={
            "sections_count": len(state["document_outline"]["sections"])
        },
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Generate each section
    sections = state["document_outline"]["sections"]
    generated_sections = {}
    total_words = 0
    
    for i, section in enumerate(sections):
        section_start = datetime.now()
        
        # Skip optional sections if we're running long
        if section.get("priority") == "optional" and total_words > 3500:
            print(f"[Generation] Skipping optional section: {section.get('title')}")
            continue
        
        # Log section start
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type="section_generation",
            content=f"Generating section {i+1}/{len(sections)}: {section.get('title')}",
            data={
                "section_index": i,
                "section_title": section.get('title'),
                "progress_percentage": int((i / len(sections)) * 100)
            },
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
        
        # Generate the section
        section_content = await generate_section(
            section_info=section,
            state=state,
            previous_sections=generated_sections
        )
        
        generated_sections[section.get('title')] = section_content
        total_words += section_content["word_count"]
        
        # Log section completion
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type="section_complete",
            content=f"Completed section: {section.get('title')}",
            data={
                "section_title": section.get('title'),
                "word_count": section_content["word_count"],
                "duration_seconds": (datetime.now() - section_start).total_seconds()
            },
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
    
    # Update state with generated sections
    state["document_sections"] = generated_sections
    
    # Log generation completion
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="generation_complete",
        content=f"Generated {len(generated_sections)} sections",
        data={
            "total_sections": len(generated_sections),
            "total_words": total_words,
            "duration_seconds": (datetime.now() - start_time).total_seconds()
        },
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Update workflow state
    state["current_stage"] = "generation"
    state["completed_stages"] = state.get("completed_stages", []) + ["generation"]
    state["stage_timings"]["generation"] = (datetime.now() - start_time).total_seconds()
    
    return state