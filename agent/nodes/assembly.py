"""
Assembly and polish node - combines sections and creates final document
"""
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState
from utils.supabase_client import supabase_manager
import os


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.5,
    api_key=os.getenv("OPENAI_API_KEY")
)


async def assemble_and_polish(state: AgentState) -> AgentState:
    """
    Assemble sections into final document and add polish
    """
    start_time = datetime.now()
    
    # Log assembly start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="assembly_start",
        content="Assembling and polishing final document",
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # First, assemble all sections in order
    sections_in_order = []
    for section_info in state["document_outline"]["sections"]:
        section_title = section_info["title"]
        if section_title in state["document_sections"]:
            sections_in_order.append({
                "title": section_title,
                "content": state["document_sections"][section_title]["content"]
            })
    
    # Build the document content
    document_parts = [f"# {state['document_outline']['document_type'].replace('_', ' ').title()} for {state.get('account_data', {}).get('name', 'Client')}"]
    
    # Add metadata
    document_parts.append(f"\n*Generated on: {datetime.now().strftime('%B %d, %Y')}*")
    document_parts.append(f"*Prepared for: {state.get('account_data', {}).get('contact', 'Client Team')}*\n")
    
    # Add table of contents for longer documents
    if len(sections_in_order) > 5:
        document_parts.append("## Table of Contents\n")
        for i, section in enumerate(sections_in_order, 1):
            document_parts.append(f"{i}. {section['title']}")
        document_parts.append("")
    
    # Add each section
    for section in sections_in_order:
        document_parts.append(f"## {section['title']}\n")
        document_parts.append(section['content'])
        document_parts.append("")  # Add spacing
    
    # Join all parts
    assembled_document = "\n".join(document_parts)
    
    # Generate executive summary if not already present
    has_exec_summary = any(
        "executive" in section["title"].lower() 
        for section in sections_in_order
    )
    
    if not has_exec_summary and len(sections_in_order) > 3:
        exec_summary_prompt = f"""Based on the following document, create a compelling executive summary that captures the key points in 200-300 words.

Document content:
{assembled_document[:5000]}

Focus on:
1. The main value proposition
2. Key recommendations or solutions
3. Expected outcomes or benefits
4. Clear next steps

Write in a professional, persuasive tone suitable for {state.get('target_audience', 'executives')}.
"""
        
        try:
            summary_response = await llm.ainvoke(exec_summary_prompt)
            state["executive_summary"] = summary_response.content
            
            # Insert executive summary at the beginning
            parts = assembled_document.split("\n", 4)
            if len(parts) > 4:
                assembled_document = "\n".join(parts[:4]) + "\n\n## Executive Summary\n\n" + summary_response.content + "\n" + parts[4]
        except Exception as e:
            print(f"[Assembly] Error generating executive summary: {e}")
    
    # Apply final polish - transitions and consistency
    polish_prompt = f"""Review this document and make minor edits to improve flow and consistency:

{assembled_document[:8000]}

Please:
1. Ensure smooth transitions between sections
2. Fix any inconsistencies in tone or terminology
3. Add brief transition sentences where needed
4. Ensure the conclusion has a clear call to action

Return the polished document with improvements. Keep all the content and structure, just improve the flow.
"""

    try:
        polish_response = await llm.ainvoke(polish_prompt)
        final_document = polish_response.content
    except Exception as e:
        print(f"[Assembly] Error during polish phase: {e}")
        final_document = assembled_document
    
    # Set the final document content
    state["document_content"] = final_document
    
    # Calculate final metrics
    total_words = len(final_document.split())
    
    # Log assembly completion
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="assembly_complete",
        content="Document assembly and polish complete",
        data={
            "total_sections": len(sections_in_order),
            "total_words": total_words,
            "has_executive_summary": bool(state.get("executive_summary")),
            "quality_score": state.get("overall_quality_score", 0.8),
            "duration_seconds": (datetime.now() - start_time).total_seconds()
        },
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Update workflow state
    state["current_stage"] = "assembly"
    state["completed_stages"] = state.get("completed_stages", []) + ["assembly"]
    state["stage_timings"]["assembly"] = (datetime.now() - start_time).total_seconds()
    
    return state