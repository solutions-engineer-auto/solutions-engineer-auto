"""
Enhanced state management for the document generation agent
"""
from typing import TypedDict, Dict, Any, List, Optional
from datetime import datetime


class DocumentSection(TypedDict):
    """Represents a section of the generated document"""
    title: str
    content: str
    quality_score: Optional[float]
    word_count: int
    generated_at: Optional[datetime]


class DocumentOutline(TypedDict):
    """Document structure planning"""
    document_type: str  # proposal, rfp_response, technical_doc, etc.
    sections: List[Dict[str, Any]]  # List of planned sections
    estimated_length: int
    key_points: List[str]


class RetrievedDocument(TypedDict):
    """Retrieved source document from Supabase"""
    id: str
    file_name: str
    file_type: Optional[str]
    content: str
    metadata: Optional[Dict[str, Any]]
    relevance_score: Optional[float]
    relevance_reasoning: Optional[str]


class ValidationResult(TypedDict):
    """Validation results for the document"""
    is_valid: bool
    completeness_score: float
    issues: List[str]
    suggestions: List[str]


class AgentState(TypedDict):
    """Enhanced agent state for sophisticated document generation"""
    # Core fields (required)
    task: str
    account_data: Dict[str, Any]
    document_id: str
    user_id: str
    thread_id: str
    run_id: str
    
    # Document retrieval
    retrieved_documents: Optional[List[RetrievedDocument]]
    selected_context: Optional[str]  # Curated context from retrieved docs
    
    # Planning and structure
    document_outline: Optional[DocumentOutline]
    target_audience: Optional[str]
    key_requirements: Optional[List[str]]
    
    # Generated content
    document_sections: Optional[Dict[str, DocumentSection]]
    document_content: Optional[str]  # Final assembled document
    executive_summary: Optional[str]
    
    # Quality and validation
    validation_results: Optional[ValidationResult]
    overall_quality_score: Optional[float]
    
    # Workflow management
    current_stage: Optional[str]
    completed_stages: Optional[List[str]]
    stage_timings: Optional[Dict[str, float]]
    
    # Error handling
    failed_events: Optional[List[Dict[str, Any]]]
    errors: Optional[List[str]]
    
    # Completion
    complete: bool


def initialize_state(
    task: str,
    account_data: Dict[str, Any],
    document_id: str,
    user_id: str,
    thread_id: str = None,
    run_id: str = None
) -> AgentState:
    """Initialize a new agent state with required fields"""
    import uuid
    
    # Ensure account_data is not None and has default values
    if account_data is None:
        account_data = {}
    
    # Provide defaults for common fields
    account_data_with_defaults = {
        "name": "Client",
        "stage": "Unknown",
        "value": "Unknown",
        "contact": "Unknown",
        **account_data  # Override with actual values if provided
    }
    
    return {
        "task": task,
        "account_data": account_data_with_defaults,
        "document_id": document_id,
        "user_id": user_id,
        "thread_id": thread_id or f"thread-{uuid.uuid4().hex[:12]}",
        "run_id": run_id or f"run-{uuid.uuid4().hex[:12]}",
        "complete": False,
        "completed_stages": [],
        "stage_timings": {},
        "errors": []
    }