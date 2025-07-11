"""
Document retrieval node with hybrid approach
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from pydantic import SecretStr
from state import AgentState, RetrievedDocument
from utils.supabase_client import supabase_manager
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

async def retrieve_documents(state: AgentState) -> AgentState:
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
        event_type="retrieval_start",
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
            event_type="retrieval_complete",
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
        state["errors"].append(f"Retrieval failed: {e}")
        state["selected_context"] = "Error retrieving documents."
        state["retrieved_documents"] = []

    # Update workflow state
    state["current_stage"] = "retrieval"
    state["completed_stages"].append("retrieval")
    state["stage_timings"]["retrieval"] = (datetime.now() - start_time).total_seconds()
    
    return state