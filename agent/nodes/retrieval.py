"""
Document retrieval node with hybrid approach
"""
from typing import List, Dict, Any
from datetime import datetime
from langchain_openai import ChatOpenAI
from state import AgentState, RetrievedDocument
from utils.supabase_client import supabase_manager
import os


llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.3,  # Lower temperature for more consistent scoring
    api_key=os.getenv("OPENAI_API_KEY")
)


async def score_document_relevance(
    documents: List[Dict[str, Any]],
    task: str,
    account_context: Dict[str, Any]
) -> List[RetrievedDocument]:
    """Score documents for relevance using LLM with Research Specialist persona"""
    if not documents:
        return []
    
    # Import persona enhancement
    from utils.prompts import AGENT_PERSONAS, get_reasoning_steps, get_context_adjustments
    
    persona = AGENT_PERSONAS["research_specialist"]
    
    # Create enhanced prompt with persona
    scoring_prompt = f"""You are a {persona['role']} with {persona['experience']}.
Your expertise: {persona['expertise']}
Your approach: {persona['approach']}

Your current mission: Evaluate documents for deep relevance to a client's needs, looking beyond surface-level keyword matches to find insights that could inform strategic recommendations.

{get_reasoning_steps('analysis')}

Task: {task}
Client: {account_context.get('name', 'Unknown')}
Client Stage: {account_context.get('stage', 'Unknown')}
Deal Value: {account_context.get('value', 'Unknown')}

Context adjustments:
{get_context_adjustments(account_context)}

For each document below, provide:
1. A relevance score from 0.0 to 1.0 (be discriminating - only truly relevant docs should score above 0.7)
2. Strategic insights: What hidden value does this document provide?
3. Connection points: How does this relate to unstated client needs?

Documents to evaluate:
"""
    
    for i, doc in enumerate(documents):
        doc_preview = doc.get('content', '')[:500]  # First 500 chars
        scoring_prompt += f"""
Document {i+1}:
- File Name: {doc.get('file_name', 'Unknown')}
- File Type: {doc.get('file_type', 'Unknown')}
- Preview: {doc_preview}...
- Metadata: {doc.get('metadata', {})}

"""

    scoring_prompt += """
Return your evaluation as a JSON array with this structure:
[
    {
        "index": 0,
        "relevance_score": 0.0-1.0,
        "reasoning": "Strategic insight about how this document serves the client's needs",
        "hidden_value": "Unstated benefits or connections you discovered"
    },
    ...
]

Remember: As a Senior Research Analyst, your value lies in discovering non-obvious connections that others might miss.
"""

    try:
        response = await llm.ainvoke(scoring_prompt)
        
        # Parse the response
        import json
        # Extract JSON from the response
        content = response.content
        start_idx = content.find('[')
        end_idx = content.rfind(']') + 1
        if start_idx >= 0 and end_idx > start_idx:
            scores = json.loads(content[start_idx:end_idx])
        else:
            scores = []
        
        # Map scores back to documents
        scored_docs: List[RetrievedDocument] = []
        for score_data in scores:
            idx = score_data.get('index', 0)
            if idx < len(documents):
                doc = documents[idx]
                scored_docs.append({
                    "id": doc.get('id', ''),
                    "file_name": doc.get('file_name', ''),
                    "file_type": doc.get('file_type'),
                    "content": doc.get('content', ''),
                    "metadata": doc.get('metadata'),
                    "relevance_score": float(score_data.get('relevance_score', 0.0)),
                    "relevance_reasoning": score_data.get('reasoning', '')
                })
        
        return scored_docs
        
    except Exception as e:
        print(f"[Retrieval] Error scoring documents: {e}")
        # Return documents without scores
        return [
            {
                "id": doc.get('id', ''),
                "file_name": doc.get('file_name', ''),
                "file_type": doc.get('file_type'),
                "content": doc.get('content', ''),
                "metadata": doc.get('metadata'),
                "relevance_score": 0.5,  # Default score
                "relevance_reasoning": "Error during scoring"
            }
            for doc in documents
        ]


async def retrieve_documents(state: AgentState) -> AgentState:
    """
    Retrieve and rank relevant documents for the task
    """
    start_time = datetime.now()
    
    # Log retrieval start
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="retrieval_start",
        content="Starting document retrieval",
        data={"account_id": state.get("account_data", {}).get("id")},
        thread_id=state["thread_id"],
        run_id=state["run_id"]
    )
    
    # Step 1: Retrieve all documents for the account
    account_id = state.get("account_data", {}).get("id")
    if not account_id:
        state["errors"] = state.get("errors", []) + ["No account ID provided"]
        state["retrieved_documents"] = []
        return state
    
    documents = await supabase_manager.retrieve_account_documents(
        account_id=account_id,
        limit=20  # Get more documents initially
    )
    
    print(f"[Retrieval] Found {len(documents)} documents for account {account_id}")
    
    # Step 2: Score documents for relevance if any found
    if documents:
        scored_documents = await score_document_relevance(
            documents=documents,
            task=state["task"],
            account_context=state.get("account_data", {})
        )
        
        # Sort by relevance score and take top 5
        sorted_docs = sorted(
            scored_documents,
            key=lambda x: x.get("relevance_score", 0),
            reverse=True
        )[:5]
        
        state["retrieved_documents"] = sorted_docs
        
        # Create curated context from top documents
        context_parts = []
        for doc in sorted_docs:
            if doc.get("relevance_score", 0) > 0.6:  # Only include highly relevant docs
                context_parts.append(f"""
### {doc['file_name']} (Relevance: {doc['relevance_score']:.2f})
{doc['relevance_reasoning']}

Content excerpt:
{doc['content'][:1000]}...
""")
        
        state["selected_context"] = "\n\n".join(context_parts) if context_parts else None
        
        # Log results
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type="retrieval_complete",
            content=f"Retrieved and scored {len(documents)} documents, selected top {len(sorted_docs)}",
            data={
                "total_documents": len(documents),
                "selected_count": len(sorted_docs),
                "top_scores": [doc.get("relevance_score", 0) for doc in sorted_docs],
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            },
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
    else:
        state["retrieved_documents"] = []
        state["selected_context"] = None
        
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type="retrieval_complete",
            content="No documents found for account",
            data={"duration_seconds": (datetime.now() - start_time).total_seconds()},
            thread_id=state["thread_id"],
            run_id=state["run_id"]
        )
    
    # Update workflow state
    state["current_stage"] = "retrieval"
    state["completed_stages"] = state.get("completed_stages", []) + ["retrieval"]
    state["stage_timings"]["retrieval"] = (datetime.now() - start_time).total_seconds()
    
    return state