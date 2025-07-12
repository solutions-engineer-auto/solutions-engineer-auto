"""
Assembly node - combines sections and creates final document
"""
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState
from utils.supabase_client import supabase_manager
from constants.events import EventTypes
import os
import re


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.5,
    api_key=os.getenv("OPENAI_API_KEY")
)


async def assemble_and_polish(state: AgentState) -> AgentState:
    """
    Assemble sections into final document
    """
    start_time = datetime.now()
    
    # Log assembly start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.ASSEMBLY_STARTED,
        content="Assembling final document",
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
    
    # Add metadata with proper markdown line breaks
    document_parts.append("")  # Empty line after title
    document_parts.append(f"**Written:** {datetime.now().strftime('%B %d, %Y')}  ")  # Two spaces at end for line break
    document_parts.append(f"**Prepared for:** {state.get('account_data', {}).get('contact', 'Client Team')}  ")
    document_parts.append("")  # Empty line after metadata
    
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

CRITICAL: Return ONLY the executive summary content in markdown format. Do not include any introductory text, meta-commentary, or explanations. Start directly with the summary content.
"""
        
        try:
            summary_response = await llm.ainvoke(exec_summary_prompt)
            state["executive_summary"] = summary_response.content
            
            # Insert executive summary after metadata
            # Find the position after both metadata lines
            lines = assembled_document.split("\n")
            insert_position = 0
            
            # Skip title and empty lines, find after "Prepared for" line
            for i, line in enumerate(lines):
                if line.strip().startswith("*Prepared for:"):
                    insert_position = i + 1
                    # Skip any empty lines after metadata
                    while insert_position < len(lines) and not lines[insert_position].strip():
                        insert_position += 1
                    break
            
            # Insert the executive summary
            lines.insert(insert_position, "## Executive Summary\n")
            lines.insert(insert_position + 1, summary_response.content)
            lines.insert(insert_position + 2, "")
            assembled_document = "\n".join(lines)
        except Exception as e:
            # Log error but continue without executive summary
            import traceback
            traceback.print_exc()
    
    # Skip polish phase - use assembled document directly
    final_document = assembled_document
    
    # Set the final document content
    state["document_content"] = final_document
    
    # Calculate final metrics
    total_words = len(final_document.split())
    
    # Log assembly completion
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.ASSEMBLY_COMPLETED,
        content="Document assembly complete",
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