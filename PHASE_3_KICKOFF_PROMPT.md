# Phase 3: API Integration - Senior React Developer Kickoff Prompt

## 🎯 Executive Summary

You're implementing Phase 3 of our AI Diff System - connecting the visual diff UI to the actual LLM API. The frontend diff system is complete and working beautifully. Now it's time to make it intelligent by integrating with the LangGraph agent backend.

**Current State**: 
- ✅ Phase 1: Selection handling and context building complete
- ✅ Phase 2: Visual diff UI with accept/reject fully working
- 🔄 Phase 3: Connect to LLM for actual AI-powered suggestions

## 🏗️ What You're Building

### User Flow
1. User selects text in the document
2. Presses Cmd/Ctrl + K (or uses context menu)
3. Enters instruction (e.g., "make more formal")
4. System sends request to LLM
5. LLM response is parsed into diff changes
6. Changes appear as cyan highlights
7. User clicks to review and accept/reject

## 📁 Key Files to Understand

### Existing API Infrastructure
```
api/langgraph/
├── start.js      # Start new agent thread
├── stream.js     # SSE streaming responses
├── check-run.js  # Check run status
└── feedback.js   # Submit feedback

src/services/
├── langGraphClient.js  # API client wrapper
└── langGraphSSE.js     # Server-sent events handler
```

### Components to Integrate
```
src/extensions/DiffExtension/
├── SelectionHandler.js  # Captures selected text
├── index.js            # Main extension (has onRequestEdit)
└── DiffExtensionV2.js  # Where changes are applied

src/services/
└── contextBuilder.js   # Formats API requests
```

## 🔌 Integration Architecture

### 1. API Request Flow
```javascript
// When user requests an edit (Cmd+K)
handleAIEditRequest = async ({ quarantine }) => {
  // 1. Show instruction modal/input
  const instruction = await getUserInstruction();
  
  // 2. Build API request using contextBuilder
  const request = contextBuilder.buildRequest(quarantine, instruction);
  
  // 3. Send to LangGraph agent
  const response = await langGraphClient.requestEdit(request);
  
  // 4. Parse response into changes
  const changes = parseAgentResponse(response);
  
  // 5. Apply changes to document
  changes.forEach(change => {
    editor.commands.addChange(change);
  });
};
```

### 2. LangGraph Integration Pattern
```javascript
// src/services/langGraphEditService.js (NEW)
export class LangGraphEditService {
  async requestEdit(documentId, selection, instruction) {
    // Start a new thread for this edit request
    const { thread_id } = await fetch('/api/langgraph/start', {
      method: 'POST',
      body: JSON.stringify({ accountId })
    }).then(r => r.json());
    
    // Stream the response
    const eventSource = new EventSource(
      `/api/langgraph/stream?thread_id=${thread_id}`
    );
    
    // Send the edit request
    await fetch('/api/langgraph/stream', {
      method: 'POST',
      body: JSON.stringify({
        thread_id,
        input: {
          documentId,
          selection,
          instruction,
          mode: 'edit_selection'
        }
      })
    });
    
    // Handle streaming response
    return new Promise((resolve, reject) => {
      const changes = [];
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'suggested_edit') {
          changes.push(parseEditSuggestion(data));
        }
        
        if (data.type === 'end') {
          eventSource.close();
          resolve(changes);
        }
      };
      
      eventSource.onerror = reject;
    });
  }
}
```

### 3. Response Parser
```javascript
// Convert agent response to diff changes
function parseEditSuggestion(suggestion) {
  return {
    type: determineChangeType(suggestion),
    originalText: suggestion.original,
    suggestedText: suggestion.replacement,
    position: {
      from: suggestion.start,
      to: suggestion.end
    },
    instruction: suggestion.reasoning
  };
}

function determineChangeType(suggestion) {
  if (!suggestion.original && suggestion.replacement) {
    return 'addition';
  } else if (suggestion.original && !suggestion.replacement) {
    return 'deletion';
  } else {
    return 'modification';
  }
}
```

## 🎨 UI Components

### 1. Instruction Input Modal
```javascript
// Simple modal for entering edit instructions
const InstructionModal = ({ onSubmit, onCancel, selectedText }) => {
  const [instruction, setInstruction] = useState('');
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-panel p-6 max-w-md w-full">
        <h2 className="text-xl text-white mb-4">How should I edit this text?</h2>
        
        <div className="bg-black/40 p-3 rounded mb-4 text-white/70">
          "{selectedText}"
        </div>
        
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g., Make it more formal, fix grammar, simplify..."
          className="w-full p-3 bg-black/40 text-white rounded"
          rows={3}
          autoFocus
        />
        
        <div className="flex gap-3 mt-4">
          <button onClick={onCancel} className="btn-volcanic">
            Cancel
          </button>
          <button 
            onClick={() => onSubmit(instruction)}
            className="btn-volcanic-primary"
            disabled={!instruction.trim()}
          >
            Apply Edit
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 2. Loading States
```javascript
// Show loading state while waiting for LLM
const LoadingOverlay = ({ message = "AI is thinking..." }) => (
  <div className="fixed bottom-4 right-4 glass-panel p-4 flex items-center gap-3">
    <div className="animate-spin h-5 w-5 border-2 border-cyan-500 border-t-transparent rounded-full" />
    <span className="text-white/70">{message}</span>
  </div>
);
```

## ⚠️ Important Considerations

### 1. Error Handling
```javascript
try {
  const changes = await langGraphEditService.requestEdit(...);
  if (changes.length === 0) {
    alert('AI couldn\'t suggest any changes. Try a different instruction.');
  }
} catch (error) {
  console.error('[AI Edit] Error:', error);
  alert('Failed to get AI suggestions. Please try again.');
}
```

### 2. Position Mapping
The LLM might return positions that need adjustment:
```javascript
// LLM returns character offsets, we need ProseMirror positions
function mapLLMPositionToProseMirror(llmPos, docNode) {
  // Account for paragraph nodes, etc.
  return docNode.resolve(llmPos + 1).pos; // Simplified example
}
```

### 3. Streaming vs Batch
Decide whether to show changes as they stream in or wait for complete response:
```javascript
// Option 1: Apply changes as they arrive
eventSource.onmessage = (event) => {
  const change = parseEditSuggestion(event.data);
  editor.commands.addChange(change); // Immediate
};

// Option 2: Batch apply after complete
const changes = await collectAllChanges(eventSource);
changes.forEach(change => editor.commands.addChange(change));
```

## 🧪 Testing Strategy

### 1. Mock LLM Responses
```javascript
// For development/testing
const mockLLMResponse = {
  suggestions: [
    {
      original: "really cool",
      replacement: "highly effective",
      start: 10,
      end: 21,
      reasoning: "More professional tone"
    }
  ]
};
```

### 2. Test Cases
- Single word replacement
- Multi-paragraph edits
- Grammar corrections
- Tone adjustments
- Edge cases (empty selection, very long text)

## 🚀 Implementation Steps

### Day 1: Basic Integration
1. Create `LangGraphEditService`
2. Wire up to `onRequestEdit` callback
3. Implement instruction modal
4. Test with mock responses

### Day 2: Real API Connection
1. Connect to actual LangGraph endpoints
2. Handle authentication/session
3. Implement error handling
4. Add loading states

### Day 3: Polish & Edge Cases
1. Handle streaming responses
2. Position mapping refinements
3. Multiple suggestions handling
4. Keyboard shortcuts

## 🎯 Success Criteria

1. **Functional**: Cmd+K → Enter instruction → See diff highlights
2. **Responsive**: Loading states, no UI freezing
3. **Reliable**: Graceful error handling
4. **Intuitive**: Clear what's happening at each step

## 💡 Pro Tips

1. **Start Simple**: Get one edit working end-to-end before adding complexity
2. **Use Existing Patterns**: Follow the AI Chat implementation patterns
3. **Test Position Mapping**: This is where most bugs will occur
4. **Consider Rate Limiting**: Don't spam the API with requests
5. **Cache Responses**: Same selection + instruction = same result?

## 🔗 References

- Current AI Chat implementation: `src/components/AIChat/useAIChat.js`
- Agent API docs: `/api/langgraph/README.md` (if exists)
- Phase 1 & 2 implementation docs

Remember: The diff system is rock-solid. Your job is to feed it intelligent changes from the LLM. Keep the integration layer thin and focused.

Good luck! 🚀 