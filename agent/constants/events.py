"""
Event type constants for the document generation agent.

Uses a consistent naming pattern: {scope}.{action}.{status}
- scope: The module or component (workflow, node name)
- action: The specific operation being performed
- status: The state of the operation (started, completed, failed)
"""


class EventTypes:
    """Unified event type constants for consistent event handling."""
    
    # Workflow events
    WORKFLOW_STARTED = "workflow.process.started"
    WORKFLOW_COMPLETED = "workflow.process.completed"
    DOCUMENT_READY = "workflow.document.ready"
    
    # Account fetch node events
    ACCOUNT_FETCH_STARTED = "node.account_fetch.started"
    ACCOUNT_FETCHED = "node.account_fetch.completed"
    ACCOUNT_FETCH_FAILED = "node.account_fetch.failed"
    
    # Retrieval node events
    RETRIEVAL_STARTED = "node.retrieval.started"
    RETRIEVAL_COMPLETED = "node.retrieval.completed"
    
    # Analysis node events
    ANALYSIS_STARTED = "node.analysis.started"
    ANALYSIS_COMPLETED = "node.analysis.completed"
    ANALYSIS_FAILED = "node.analysis.failed"
    
    # Planning node events
    PLANNING_STARTED = "node.planning.started"
    PLANNING_COMPLETED = "node.planning.completed"
    PLANNING_FAILED = "node.planning.failed"
    
    # Generation node events
    GENERATION_STARTED = "node.generation.started"
    GENERATION_COMPLETED = "node.generation.completed"
    SECTION_STARTED = "node.generation.section.started"
    SECTION_COMPLETED = "node.generation.section.completed"
    
    # Validation node events
    VALIDATION_STARTED = "node.validation.started"
    VALIDATION_COMPLETED = "node.validation.completed"
    VALIDATION_FAILED = "node.validation.failed"
    
    # Assembly node events
    ASSEMBLY_STARTED = "node.assembly.started"
    ASSEMBLY_COMPLETED = "node.assembly.completed"


class DisplayConfig:
    """Display configuration for different event types."""
    
    # Icon mappings for activity indicators
    ICON_MAP = {
        "retrieval": "📖",
        "analysis": "📊",
        "planning": "🗺️",
        "generation": "✨",
        "validation": "✅",
        "assembly": "🔧",
        "workflow": "⚡",
        "error": "⚠️",
        "default": "⚡"
    }
    
    @staticmethod
    def get_display_config(event_type: str, is_error: bool = False) -> dict:
        """
        Get display configuration for an event type.
        
        Args:
            event_type: The unified event type
            is_error: Whether this is an error event
            
        Returns:
            Dictionary with display configuration
        """
        # Extract the node/component name from the event type
        parts = event_type.split(".")
        component = parts[1] if len(parts) > 1 else "default"
        status = parts[2] if len(parts) > 2 else ""
        
        # Determine icon
        icon = "error" if is_error or status == "failed" else component
        
        # Determine display rules
        show_activity = status == "started" or "section.started" in event_type
        
        # Special cases: suppress workflow.completed and document.ready messages
        if event_type in [EventTypes.WORKFLOW_COMPLETED, EventTypes.DOCUMENT_READY]:
            persist_message = False
        else:
            persist_message = status in ["completed", "failed"]
        
        return {
            "icon": icon,
            "show_activity": show_activity,
            "persist_message": persist_message
        }