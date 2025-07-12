# Human-in-the-Loop Document Editing Implementation Plan

## Executive Summary

This document outlines a phased implementation plan for adding human-in-the-loop (HITL) document editing capabilities to the solutions-engineer-auto system using LangGraph interrupts. The goal is to enable iterative document refinement without regenerating entire documents from scratch.

**Key Insight**: LangGraph Cloud provides built-in checkpointing, making implementation much simpler than initially anticipated. An MVP can be delivered in 2 days, with full implementation in 1 week.

## Current State Analysis

### System Architecture
- **LangGraph Cloud**: Deployed agent with linear workflow and automatic checkpointing
- **Frontend**: React + TipTap editor with real-time updates via Supabase realtime
- **Backend**: Supabase for persistence, LangGraph SDK for orchestration
- **Communication**: RESTful endpoints + Supabase postgres_changes subscriptions

### Current Limitations
1. **Full Regeneration**: Follow-up messages trigger complete document regeneration
2. **No Interrupt Points**: Workflow doesn't pause for human review
3. **Linear Workflow**: No conditional routing based on document state
4. **No Edit Mode**: Can't distinguish between generation and editing requests

### Technical Requirements
1. **Interrupt Implementation**: Add interrupt() calls at strategic points
2. **State Enhancement**: Add fields for edit mode and history
3. **Conditional Routing**: Dynamic workflow based on document existence
4. **API Modifications**: Support for resuming interrupted workflows
5. **Frontend Updates**: UI states for edit mode vs generation mode
6. **Realtime Integration**: Leverage existing Supabase postgres_changes for immediate UI updates

## MVP Implementation (2 Days)

### Day 1: Backend Changes

#### 1. Add Simple Review Checkpoint
**File**: `agent/agent.py`
```python
from langgraph.types import interrupt

async def review_checkpoint(state: AgentState) -> AgentState:
    """Simple review with interrupt"""
    
    # Log ready state - this will trigger realtime update to frontend
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="READY_FOR_REVIEW",
        content="Document ready. Reply with changes or 'approve'"
    )
    
    # Interrupt for review
    feedback = interrupt({
        "message": "Review document or type 'approve' to finish",
        "preview": state["document_content"][:500]
    })
    
    if "approve" in feedback.lower():
        state["approved"] = True
    else:
        state["human_feedback"] = feedback
        state["needs_edit"] = True
    
    return state

# Add to workflow
workflow.add_edge("assemble", "review_checkpoint")
workflow.add_edge("review_checkpoint", "finalize")

# No checkpointer configuration needed for LangGraph Cloud!
return workflow.compile()
```

#### 2. Update State for MVP
**File**: `agent/state.py`
```python
class AgentState(TypedDict):
    # ... existing fields ...
    
    # MVP edit fields
    needs_edit: Optional[bool]
    approved: Optional[bool]
    edit_count: Optional[int]
```

### Day 2: API & Frontend Updates

#### 1. Update Feedback Endpoint
**File**: `api/langgraph/feedback.js`
```javascript
export default async function handler(req, res) {
  const { threadId, feedback, userId, documentId } = req.body;

  try {
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });

    // Check thread state
    const thread = await client.threads.get(threadId);
    const isInterrupted = thread.status === "interrupted";

    let run;
    if (isInterrupted) {
      // Resume from interrupt
      run = await client.runs.create(threadId, null, {
        command: { resume: feedback }
      });
    } else {
      // Normal feedback
      run = await client.runs.create(threadId, 'document_generator', {
        input: { 
          human_feedback: feedback,
          task: feedback,
          user_id: userId,
          document_id: documentId,
          thread_id: threadId
        },
        multitaskStrategy: 'enqueue'
      });
    }

    res.json({
      success: true,
      runId: run.run_id,
      mode: isInterrupted ? 'resume' : 'new'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### 2. Add UI Indicator
**File**: `src/components/AIChat/AIChatPanel.jsx`
```javascript
// Simple indicator for interrupted state based on realtime events
{connectionStatus.isConnected && messages.some(m => 
  m.eventData?.type === "READY_FOR_REVIEW"
) && (
  <div className="review-mode-banner">
    <span>👁️ Review Mode</span>
    <p>Document ready - request changes or type 'approve'</p>
  </div>
)}
```

### MVP Testing

#### Local Testing with MemorySaver
```python
# test_mvp_locally.py
from langgraph.checkpoint.memory import MemorySaver
import asyncio

async def test_mvp():
    # For local testing only
    workflow = build_workflow()
    graph = workflow.compile(checkpointer=MemorySaver())
    
    config = {"configurable": {"thread_id": "test-123"}}
    
    # Run until interrupt
    result = await graph.ainvoke(initial_state, config)
    print("Interrupted:", result.get("interrupt_data"))
    
    # Resume with feedback
    final = await graph.ainvoke(
        {"resume": "make it more technical"},
        config
    )
    print("Final:", final.get("document_content")[:200])

asyncio.run(test_mvp())
```

## Full Implementation Plan

### Phase 1: Enhanced Interrupts and Routing (Week 1)

#### 1.1 Development Setup
```python
# agent/agent.py - for local development only
def build_graph():
    workflow = StateGraph(AgentState)
    # ... add nodes ...
    
    # Local development uses MemorySaver
    if os.getenv("LANGGRAPH_ENV") == "local":
        from langgraph.checkpoint.memory import MemorySaver
        return workflow.compile(checkpointer=MemorySaver())
    
    # LangGraph Cloud handles checkpointing automatically
    return workflow.compile()
```

#### 1.2 Enhanced State Management
**File**: `agent/state.py`
```python
class AgentState(TypedDict):
    # ... existing fields ...
    
    # Edit mode fields
    edit_mode: Optional[bool]
    edit_history: Optional[List[Dict[str, Any]]]
    current_edit_request: Optional[str]
    edit_complete: Optional[bool]
    existing_content: Optional[str]
```

#### 1.3 Create Dedicated Edit Node
**File**: `agent/nodes/editor.py`
```python
from langgraph.types import interrupt

async def edit_document(state: AgentState) -> AgentState:
    """Handle document editing with human-in-the-loop"""
    
    # Log current state - triggers realtime UI update
    await supabase_manager.log_event(
        document_id=state["document_id"],
        event_type="EDIT_MODE_ACTIVE",
        content="Ready to accept edits. What changes would you like?"
    )
    
    # Interrupt and wait for human input
    edit_request = interrupt({
        "current_content": state["document_content"],
        "message": "What changes would you like to make?"
    })
    
    # Apply edits using LLM
    updated_content = await apply_smart_edits(
        state["document_content"],
        edit_request,
        state.get("account_data", {})
    )
    
    # Update state
    state["document_content"] = updated_content
    state["edit_history"] = state.get("edit_history", []) + [{
        "request": edit_request,
        "timestamp": datetime.now().isoformat()
    }]
    
    return state
```

### Phase 2: Conditional Routing (Days 3-4)

#### 2.1 Add Routing Logic
```python
def route_after_initialize(state: AgentState) -> str:
    """Route based on whether document already exists"""
    if state.get("existing_content"):
        return "edit_mode"
    return "fetch_account"

def route_after_assembly(state: AgentState) -> str:
    """Route to review checkpoint"""
    if not state.get("skip_review"):
        return "review"
    return "finalize"

# Update workflow
workflow.add_conditional_edges(
    "initialize",
    route_after_initialize,
    {
        "edit_mode": "edit_document",
        "fetch_account": "fetch_account"
    }
)
```

#### 2.2 Update Initialize for Existing Documents
```python
async def initialize_document(state: AgentState) -> AgentState:
    """Enhanced initialization checking for existing documents"""
    
    # Check if document already has content
    if state.get("document_id"):
        existing = await supabase_manager.get_document_content(
            state["document_id"]
        )
        if existing and existing.get("content"):
            state["existing_content"] = existing["content"]
            state["document_content"] = existing["content"]
            state["edit_mode"] = True
            return state
    
    # Continue with normal initialization
    # ... existing code ...
```

### Phase 3: Frontend Enhancements (Days 5-6)

#### 3.1 Add State Detection via Realtime
```javascript
// src/hooks/useThreadState.js
import { supabase } from '../supabaseClient';

export function useThreadState(documentId) {
  const [threadState, setThreadState] = useState({
    isInterrupted: false,
    editMode: false,
    hasDocument: false
  });

  useEffect(() => {
    if (!documentId) return;

    // Subscribe to chat messages to detect interrupt states
    const subscription = supabase
      .channel(`thread-state-${documentId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `document_id=eq.${documentId}` 
        },
        (payload) => {
          const msg = payload.new;
          
          if (msg.message_type === 'event' && msg.event_data) {
            const eventType = msg.event_data.type;
            
            setThreadState(prev => ({
              ...prev,
              isInterrupted: eventType === 'READY_FOR_REVIEW',
              editMode: eventType === 'EDIT_MODE_ACTIVE',
              hasDocument: true
            }));
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  }, [documentId]);

  return threadState;
}
```

#### 3.2 Enhanced UI States
```javascript
// Dynamic placeholders and indicators based on realtime state
<AIChatInput
  placeholder={
    threadState.isInterrupted 
      ? "Review and provide feedback or type 'approve'"
      : threadState.editMode 
        ? "Describe the changes you'd like..." 
        : "Ask a question or request a document..."
  }
/>

// Real-time activity indicator
{currentActivity && (
  <div className="activity-indicator">
    <span>{currentActivity.message}</span>
    {generationProgress > 0 && (
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${generationProgress}%` }}
        />
      </div>
    )}
  </div>
)}
```

### Phase 4: Testing and Optimization (Day 7)

#### Test Scenarios
1. **MVP Flow**: Generate → Review → Edit → Approve
2. **Direct Edit**: Load existing → Edit multiple times
3. **Interruption Recovery**: Close browser → Resume later
4. **Error Cases**: Network failures, invalid input

## Local Development Guide

### Setup for Local Testing
```python
# .env.local
LANGGRAPH_ENV=local

# agent/local_test.py
from langgraph.checkpoint.memory import MemorySaver
import asyncio
from agent import build_workflow
from state import initialize_state

async def interactive_test():
    """Interactive testing with interrupts"""
    
    # Build graph with in-memory checkpointer
    workflow = build_workflow()
    graph = workflow.compile(checkpointer=MemorySaver())
    
    # Test configuration
    config = {"configurable": {"thread_id": "test-session"}}
    
    # Initial state
    state = initialize_state(
        task="Generate a technical proposal",
        account_data={"id": "test-123", "name": "Test Corp"},
        document_id="doc-test",
        user_id="user-test"
    )
    
    print("🚀 Starting document generation...")
    
    # Run until interrupt
    result = await graph.ainvoke(state, config)
    
    while result.get("interrupt_data"):
        print(f"\n⏸️  Interrupted: {result['interrupt_data']['message']}")
        print(f"Preview: {result.get('document_content', '')[:200]}...")
        
        # Get user input
        user_input = input("\n💬 Your response: ")
        
        # Resume
        print("\n▶️  Resuming...")
        result = await graph.ainvoke(
            {"resume": user_input},
            config
        )
    
    print("\n✅ Complete!")
    print(f"Final document: {result.get('document_content', '')[:500]}...")

if __name__ == "__main__":
    asyncio.run(interactive_test())
```

### Quick Test Commands
```bash
# Test MVP locally
python agent/test_mvp_locally.py

# Interactive testing
python agent/local_test.py

# Run with logging
LANGGRAPH_ENV=local python -m agent.test_interrupts
```

## Deployment Considerations

### LangGraph Cloud
- **Checkpointing**: Automatic, no configuration needed
- **State Persistence**: Handled by platform
- **Scaling**: Automatic
- **Monitoring**: Built-in observability

### Supabase Realtime
- **Real-time Updates**: Automatic via postgres_changes subscriptions
- **Channel Management**: Document-specific channels prevent message overlap
- **Connection Reliability**: Built-in reconnection and error handling
- **Performance**: Direct database triggers eliminate polling overhead

### Environment Variables
```bash
# Production (LangGraph Cloud)
# No checkpointer configuration needed!
# Supabase realtime works automatically

# Local Development
LANGGRAPH_ENV=local
```

## Risk Mitigation

### Simplified Risks
1. **Interrupt Logic Errors**
   - Mitigation: Comprehensive testing
   - Recovery: Fallback to non-interrupt flow

2. **User Confusion**
   - Mitigation: Clear UI states
   - Education: Inline help text

3. **Performance**
   - Mitigation: Efficient edit processing
   - Monitoring: Track edit latency

## Success Criteria

### MVP Metrics (2 Days)
- ✅ Users can review generated documents
- ✅ Users can request changes without full regeneration
- ✅ Basic edit functionality works
- ✅ State persists across sessions

### Full Implementation (1 Week)
- Edit operations complete in <3 seconds
- 60% reduction in full regenerations
- 90% user satisfaction with edit flow
- Zero data loss from interruptions

### Long-term Goals
- Advanced edit intelligence
- Multi-user collaboration
- Version control integration
- Automated quality checks

## Conclusion

By leveraging LangGraph Cloud's built-in checkpointing and interrupt functionality, we can implement human-in-the-loop document editing much more simply than initially planned. The MVP approach delivers immediate value in just 2 days, while the full implementation can be completed in 1 week.

The key insights:
1. LangGraph Cloud handles checkpointing automatically
2. Supabase realtime provides true push-based updates without polling
3. Local development uses simple MemorySaver for testing
4. Interrupts work seamlessly with minimal configuration
5. Agent writes directly to Supabase trigger real-time UI updates
6. Focus on user experience rather than infrastructure complexity

This approach significantly reduces complexity while delivering a powerful editing experience that saves time and improves document quality. The Supabase realtime integration ensures users see immediate feedback during document generation and editing processes.