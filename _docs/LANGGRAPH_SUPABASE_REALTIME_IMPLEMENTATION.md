# LangGraph → Supabase Realtime Implementation Guide

## Overview
This guide outlines the implementation of direct Supabase writes from LangGraph with realtime updates to the client, eliminating the need for polling through Vercel.

## Architecture Summary
- **LangGraph Agent** writes directly to Supabase using service role key
- **Client** subscribes to Supabase Realtime for updates
- **Message Types** simplified to just 'message' and 'event'
- **Documents** update incrementally during generation

## Implementation Phases

### Phase 1: Database Migration (Day 1)

Create migration file: `supabase/migrations/20250109_migrate_to_unified_messages.sql`

```sql
-- Remove old enum values and add new ones (hard migration)
ALTER TYPE message_type RENAME TO message_type_old;

CREATE TYPE message_type AS ENUM ('message', 'event');

-- Migrate existing data and add new columns
ALTER TABLE chat_messages 
  ALTER COLUMN message_type TYPE message_type USING 
    CASE 
      WHEN message_type::text = 'response' THEN 'message'::message_type
      ELSE 'event'::message_type
    END,
  ADD COLUMN event_data JSONB,
  ADD COLUMN thread_id TEXT,
  ADD COLUMN run_id TEXT;

DROP TYPE message_type_old;

-- Add indexes for performance
CREATE INDEX idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX idx_chat_messages_message_type ON chat_messages(message_type);

-- Update documents table for generation tracking
ALTER TABLE documents
  ADD COLUMN generation_status TEXT DEFAULT 'idle',
  ADD COLUMN generation_started_at TIMESTAMPTZ,
  ADD COLUMN generation_completed_at TIMESTAMPTZ,
  ADD COLUMN last_activity_at TIMESTAMPTZ;

-- Enable realtime on chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

### Phase 2: API Updates (Day 2)

#### Update `/api/langgraph/start.js`
```javascript
// Extract user_id from request and pass to agent
export default async function handler(req, res) {
  // ... existing validation ...
  
  const { prompt, accountData, userId } = parsedBody;
  
  try {
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });
    
    const thread = await client.threads.create();
    
    const run = await client.runs.create(thread.thread_id, 'document_generator', {
      input: { 
        task: prompt, 
        account_data: accountData,
        user_id: userId,  // Pass user context for document ownership
        document_id: `doc-${Date.now()}`,
        thread_id: thread.thread_id,  // Include for tracking
        run_id: null  // Will be set by agent
      },
      multitaskStrategy: 'enqueue'
    });
    
    // Update run_id in input
    run.input.run_id = run.run_id;
    
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      threadId: thread.thread_id,
      runId: run.run_id,
      documentId: run.input.document_id
    }));
  } catch (error) {
    // ... error handling ...
  }
}
```

### Phase 3: LangGraph Agent Updates (Day 3-4)

#### Update `agent/requirements.txt`
```
langchain>=0.1.0
langchain-openai>=0.0.5
langgraph>=0.0.20
supabase>=2.0.0
```

#### Update `agent/agent.py`
```python
import os
from typing import TypedDict, Dict, Any
from datetime import datetime
import uuid
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
from supabase import create_client, Client

# Initialize clients
llm = ChatOpenAI(
    model=os.getenv("OPENAI_MODEL", "gpt-4"),
    temperature=0.7,
    api_key=os.getenv("OPENAI_API_KEY")
)

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")  # Service key bypasses RLS
)

# Enhanced agent state
class AgentState(TypedDict):
    task: str
    account_data: Dict[str, Any]
    document_id: str
    document_content: str
    complete: bool
    user_id: str
    thread_id: str
    run_id: str
    failed_events: list  # For retry logic

async def log_event(state: AgentState, event_type: str, content: str, data: Dict = None):
    """Log all agent activities to chat_messages with retry logic"""
    try:
        result = await supabase.table("chat_messages").insert({
            "document_id": state["document_id"],
            "role": "assistant",
            "content": content,
            "message_type": "event",
            "event_data": {
                "type": event_type,
                "timestamp": datetime.now().isoformat(),
                **(data or {})
            },
            "thread_id": state.get("thread_id"),
            "run_id": state.get("run_id")
        }).execute()
        return result
    except Exception as e:
        print(f"[Agent] Failed to log event: {e}")
        # Store for retry
        if "failed_events" not in state:
            state["failed_events"] = []
        state["failed_events"].append({
            "event_type": event_type,
            "content": content,
            "data": data,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        })

async def update_document(state: AgentState, updates: Dict):
    """Update document with retry logic"""
    try:
        result = await supabase.table("documents").update({
            **updates,
            "last_activity_at": datetime.now().isoformat()
        }).eq("id", state["document_id"]).execute()
        return result
    except Exception as e:
        print(f"[Agent] Failed to update document: {e}")
        # Continue processing even if update fails

async def generate_document(state: AgentState) -> AgentState:
    """Enhanced document generation with Supabase integration"""
    
    print(f"[Agent] Starting generation for document: {state['document_id']}")
    
    # Log user message
    await supabase.table("chat_messages").insert({
        "document_id": state["document_id"],
        "role": "user",
        "content": state["task"],
        "message_type": "message",
        "thread_id": state["thread_id"],
        "run_id": state["run_id"]
    }).execute()
    
    # Log start event
    await log_event(state, "start", "Starting document generation", {
        "account_name": state["account_data"].get("name", "Unknown")
    })
    
    # Create document record if it doesn't exist
    try:
        await supabase.table("documents").insert({
            "id": state["document_id"],
            "title": f"Document for {state['account_data'].get('name', 'Unknown')}",
            "account_id": state["account_data"].get("id"),
            "author_id": state["user_id"],
            "generation_status": "generating",
            "generation_started_at": datetime.now().isoformat()
        }).execute()
    except Exception as e:
        # Document might already exist, update it
        await update_document(state, {
            "generation_status": "generating",
            "generation_started_at": datetime.now().isoformat()
        })
    
    # Log analysis phase
    await log_event(state, "analyze", "Analyzing account information", {
        "account_data": state["account_data"]
    })
    
    # Generate content in sections for incremental updates
    sections = [
        ("introduction", "Creating introduction"),
        ("analysis", "Analyzing requirements"),
        ("recommendations", "Generating recommendations"),
        ("conclusion", "Writing conclusion")
    ]
    
    state["document_content"] = f"# Document for {state['account_data'].get('name', 'Unknown')}\n\n"
    
    for i, (section_name, section_description) in enumerate(sections):
        # Log section start
        await log_event(state, "section_start", section_description, {
            "section": section_name,
            "progress": (i / len(sections)) * 100
        })
        
        # Generate section content
        section_prompt = f"""Generate the {section_name} section for:
        Task: {state['task']}
        Client: {state['account_data'].get('name')}
        Context: {state['account_data']}
        """
        
        try:
            response = await llm.ainvoke(section_prompt)
            section_content = f"\n## {section_name.title()}\n\n{response.content}\n"
            state["document_content"] += section_content
            
            # Update document incrementally
            await update_document(state, {
                "content": state["document_content"]
            })
            
            # Log section completion
            await log_event(state, "section_complete", f"Completed {section_name}", {
                "section": section_name,
                "progress": ((i + 1) / len(sections)) * 100,
                "word_count": len(section_content.split())
            })
            
        except Exception as e:
            await log_event(state, "error", f"Error generating {section_name}: {str(e)}", {
                "section": section_name,
                "error": str(e)
            })
    
    # Mark generation complete
    await update_document(state, {
        "generation_status": "complete",
        "generation_completed_at": datetime.now().isoformat()
    })
    
    # Log completion
    await log_event(state, "complete", "Document generation complete", {
        "total_words": len(state["document_content"].split()),
        "duration_seconds": 0  # Calculate if needed
    })
    
    # Log the final response as a message
    await supabase.table("chat_messages").insert({
        "document_id": state["document_id"],
        "role": "assistant",
        "content": "I've successfully generated your document. You can now review and edit it as needed.",
        "message_type": "message",
        "thread_id": state["thread_id"],
        "run_id": state["run_id"]
    }).execute()
    
    # Retry any failed events
    if state.get("failed_events"):
        print(f"[Agent] Retrying {len(state['failed_events'])} failed events")
        for failed in state["failed_events"]:
            await log_event(state, failed["event_type"], failed["content"], failed["data"])
    
    state["complete"] = True
    return state

# Build the graph
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("generate", generate_document)
    workflow.set_entry_point("generate")
    workflow.add_edge("generate", END)
    return workflow.compile()

# Export for LangGraph Cloud
graph = build_graph()
```

### Phase 4: Frontend Updates (Day 5-6)

#### Update `src/components/AIChat/useAIChat.js`
```javascript
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export const useAIChat = ({ documentId, accountData, onDocumentUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false });
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!documentId) return;
    
    console.log('[useAIChat] Setting up realtime subscription for:', documentId);
    
    const subscription = supabase
      .channel(`doc-${documentId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `document_id=eq.${documentId}` 
        },
        (payload) => {
          console.log('[useAIChat] Received message:', payload);
          const msg = payload.new;
          
          if (msg.message_type === 'message') {
            // Regular chat message
            setMessages(prev => [...prev, {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.created_at
            }]);
          } else if (msg.message_type === 'event') {
            // Agent event - show in chat and update activity
            const eventData = msg.event_data || {};
            
            // Add to messages (showing agent thinking)
            setMessages(prev => [...prev, {
              id: msg.id,
              role: 'assistant',
              content: msg.content,
              timestamp: msg.created_at,
              isEvent: true,
              eventType: eventData.type,
              eventData: eventData
            }]);
            
            // Update activity indicator
            setCurrentActivity({
              type: eventData.type,
              message: msg.content
            });
            
            // Update progress if available
            if (eventData.progress !== undefined) {
              setGenerationProgress(eventData.progress);
            }
            
            // Clear activity after completion
            if (eventData.type === 'complete') {
              setTimeout(() => {
                setCurrentActivity(null);
                setGenerationProgress(100);
              }, 2000);
            }
          }
          
          setConnectionStatus({ isConnected: true });
        }
      )
      .subscribe((status) => {
        console.log('[useAIChat] Subscription status:', status);
        setConnectionStatus({ 
          isConnected: status === 'SUBSCRIBED',
          error: status === 'CLOSED' ? 'Connection lost' : null
        });
      });
    
    return () => {
      console.log('[useAIChat] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [documentId]);
  
  const sendMessage = useCallback(async (message, mode = 'agent') => {
    if (isStreaming || !message.trim()) return;
    
    setIsStreaming(true);
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Call start endpoint with user context
      const response = await fetch('/api/langgraph/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          accountData: accountData,
          userId: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start generation: ${response.statusText}`);
      }
      
      const { threadId, runId, documentId: docId } = await response.json();
      
      console.log('[useAIChat] Started generation:', { threadId, runId, docId });
      
      // Messages will arrive via realtime subscription
      
    } catch (error) {
      console.error('[useAIChat] Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, accountData]);
  
  return {
    messages,
    isStreaming,
    currentActivity,
    connectionStatus,
    generationProgress,
    sendMessage,
    clearMessages: () => setMessages([])
  };
};
```

#### Update `src/pages/DocumentEditorPage.jsx`
```javascript
// Add document status subscription
useEffect(() => {
  if (!documentId) return;
  
  const subscription = supabase
    .channel(`doc-status-${documentId}`)
    .on('postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${documentId}`
      },
      (payload) => {
        const doc = payload.new;
        
        // Update local document state
        setDocument(doc);
        
        // Update editor content if changed
        if (doc.content !== editorContent) {
          setEditorContent(doc.content);
          if (editorRef.current) {
            editorRef.current.commands.setContent(doc.content);
          }
        }
        
        // Disable editing during generation
        setIsGenerating(doc.generation_status === 'generating');
      }
    )
    .subscribe();
    
  return () => subscription.unsubscribe();
}, [documentId]);

// Update editor configuration
const editor = useEditor({
  extensions: [/* ... */],
  content: editorContent,
  editable: !isGenerating, // Disable during generation
  onUpdate: ({ editor }) => {
    if (!isGenerating) {
      setEditorContent(editor.getHTML());
    }
  }
});
```

### Phase 5: Cleanup (Day 7)

#### Remove obsolete files:
- `/api/langgraph/poll.js`
- `/api/langgraph/stream.js`
- `/api/langgraph/check-run.js`

#### Update `/api/langgraph/feedback.js`
```javascript
// Simplified - just creates a new run with feedback
export default async function handler(req, res) {
  const { threadId, feedback, userId } = req.body;
  
  const client = new Client({
    apiUrl: process.env.LANGGRAPH_API_URL,
    apiKey: process.env.LANGGRAPH_API_KEY
  });
  
  const run = await client.runs.create(threadId, 'document_generator', {
    input: {
      human_feedback: feedback,
      task: feedback,
      user_id: userId
    }
  });
  
  res.json({ success: true, runId: run.run_id });
}
```

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Agent environment has Supabase credentials
- [ ] Agent can write to chat_messages table
- [ ] Agent can update documents table
- [ ] Realtime subscriptions connect properly
- [ ] Messages appear in chat UI in real-time
- [ ] Events show agent activity
- [ ] Document updates incrementally
- [ ] Progress bar reflects generation progress
- [ ] Editor disables during generation
- [ ] Editor re-enables after completion
- [ ] Failed events retry successfully
- [ ] User context flows through properly

## Troubleshooting

### Common Issues:

1. **Realtime not working**: Check that table is added to publication
2. **RLS errors**: Agent should use service key to bypass RLS
3. **Missing messages**: Verify thread_id and document_id match
4. **Duplicate messages**: Ensure subscription is cleaned up properly
5. **Editor conflicts**: Check that generation_status is properly tracked

### Debug Queries:

```sql
-- Check recent messages
SELECT * FROM chat_messages 
WHERE document_id = 'YOUR_DOC_ID' 
ORDER BY created_at DESC;

-- Check document status
SELECT id, generation_status, generation_started_at, generation_completed_at 
FROM documents 
WHERE id = 'YOUR_DOC_ID';

-- Check realtime publication
SELECT * FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

## Future Enhancements

1. Add event filtering toggle in UI
2. Implement event aggregation for cleaner display
3. Add retry queue for failed events
4. Create agent activity dashboard
5. Add export of chat/event history