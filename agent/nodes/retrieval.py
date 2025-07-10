"""
Document retrieval node with hybrid approach
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import SecretStr
from state import AgentState, RetrievedDocument
from utils.supabase_client import supabase_manager
from utils.prompts import AGENT_PERSONAS, get_reasoning_steps, get_context_adjustments
from constants.events import EventTypes
import os

# Initialize OpenAI clients
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
    temperature=0.3,
    api_key=SecretStr(os.getenv("OPENAI_API_KEY", ""))
)

embeddings_model = OpenAIEmbeddings(
    model=os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small"),
    api_key=SecretStr(os.getenv("OPENAI_API_KEY", ""))
)


async def score_document_relevance(
    documents: List[Dict[str, Any]],
    task: str,
    account_context: Dict[str, Any]
) -> List[RetrievedDocument]:
    """Score documents for relevance using LLM with Research Specialist persona"""
    if not documents:
        return []
    
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
        # Log error but continue without scoring
        import traceback
        traceback.print_exc()
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

async def retrieve_and_score_documents(state: AgentState) -> AgentState:
    """
    Retrieve and rank relevant documents for the task using a hybrid approach.
    """
    start_time = datetime.now()
    task = state["task"]
    account_data = state.get("account_data", {})
    account_id = account_data.get("id") if account_data else None
    
    # Initialize lists if they don't exist
    if "errors" not in state or state["errors"] is None:
        state["errors"] = []
    if "completed_stages" not in state or state["completed_stages"] is None:
        state["completed_stages"] = []
    if "stage_timings" not in state or state["stage_timings"] is None:
        state["stage_timings"] = {}


    if not account_id:
        state["errors"].append("No account ID provided for retrieval")
        state["retrieved_documents"] = []
        return state

    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type=EventTypes.RETRIEVAL_STARTED,
        content="Starting document retrieval with vector search",
        data={"account_id": account_id, "task": task},
        thread_id=state.get("thread_id"),
        run_id=state.get("run_id")
    )

    try:
        # 1. Generate Query Embedding
        query_embedding = await embeddings_model.aembed_query(task)

        # 2. Perform Similarity Search
        retrieved_chunks_response = await supabase_manager.rpc(
            'match_document_chunks',
            {
                'p_account_id': account_id,
                'query_embedding': query_embedding,
                'match_threshold': 0.1,  # Temporarily lowered for debugging
                'match_count': 10
            }
        )
        
        retrieved_chunks = retrieved_chunks_response

        print(f"[Retrieval] Found {len(retrieved_chunks)} relevant chunks for account {account_id}")

        if not retrieved_chunks:
            state["selected_context"] = "No relevant document sections found."
            state["retrieved_documents"] = []
            
        else:
            # 3. Consolidate and format context
            context_parts = []
            retrieved_docs_for_state: List[RetrievedDocument] = []
            for i, chunk in enumerate(retrieved_chunks):
                context_parts.append(f"--- Relevant Section {i+1} (Similarity: {chunk.get('similarity', 0):.2f}) ---\n{chunk.get('content', '')}")
                retrieved_docs_for_state.append({
                    "id": f"chunk_{i}",
                    "file_name": "Vector Search Result",
                    "file_type": "text",
                    "content": chunk.get('content', ''),
                    "relevance_score": chunk.get('similarity', 0),
                    "relevance_reasoning": "Retrieved via vector similarity search.",
                    "metadata": {} 
                })

            state["selected_context"] = "\n\n".join(context_parts)
            state["retrieved_documents"] = retrieved_docs_for_state[:5]

        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type=EventTypes.RETRIEVAL_COMPLETED,
            content=f"Retrieved {len(retrieved_chunks)} document chunks via vector search.",
            data={
                "retrieved_count": len(retrieved_chunks),
                "top_similarity": retrieved_chunks[0].get('similarity', 0) if retrieved_chunks else 0,
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            },
            thread_id=state.get("thread_id"),
            run_id=state.get("run_id")
        )

    except Exception as e:
        print(f"[Retrieval] Error during vector search: {e}")
        import traceback
        traceback.print_exc()
        state["errors"].append(f"Retrieval failed: {e}")
        state["selected_context"] = "Error retrieving documents."
        state["retrieved_documents"] = []
        
        await supabase_manager.log_event(
            document_id=state["document_id"],
            event_type=EventTypes.RETRIEVAL_COMPLETED,
            content="Retrieval failed due to error",
            data={
                "error": str(e),
                "duration_seconds": (datetime.now() - start_time).total_seconds()
            },
            thread_id=state["thread_id"],
            run_id=state["run_id")
        )
    # Update workflow state
    state["current_stage"] = "retrieval"
    state["completed_stages"].append("retrieval")
    state["stage_timings"]["retrieval"] = (datetime.now() - start_time).total_seconds()
    
    return state