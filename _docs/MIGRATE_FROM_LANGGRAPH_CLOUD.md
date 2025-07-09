# Migration Plan: From LangGraph Cloud to Local LangGraph

## Overview
This document outlines the migration from LangGraph Cloud to running LangGraph locally in the Vercel environment. This approach maintains the graph-based agent architecture while eliminating external dependencies.

## Current Architecture
- **Agent**: Python-based LangGraph agent deployed to LangGraph Cloud
- **Frontend**: React app using SSE to stream from LangGraph Cloud via proxy
- **Issues**: 
  - No events streaming from LangGraph Cloud
  - Complex SSE implementation
  - External service dependency
  - Debugging challenges

## Target Architecture
- **Agent**: JavaScript/TypeScript LangGraph running directly in Vercel Functions
- **Frontend**: Simplified API calls to local endpoints
- **Benefits**:
  - Everything runs in your Vercel environment
  - Direct debugging and logging
  - No external service costs
  - Simplified deployment

## Migration Steps

### 1. Install Required Packages
```bash
npm install @langchain/langgraph @langchain/openai
```

Note: `@langchain/langgraph` is the core framework (different from `@langchain/langgraph-sdk` which is for cloud connections)

### 2. Create Local Agent Implementation

Create `/api/agent/generate-local.js`:

```javascript
import { StateGraph, END } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { v4 as uuidv4 } from 'uuid';

// Initialize LLM
const llm = new ChatOpenAI({
  modelName: process.env.OPENAI_MODEL || "gpt-4",
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Define agent state schema
const agentStateChannels = {
  task: {
    value: (x, y) => y ?? x,
    default: () => ""
  },
  account_data: {
    value: (x, y) => y ?? x,
    default: () => ({})
  },
  document_id: {
    value: (x, y) => y ?? x,
    default: () => ""
  },
  document_content: {
    value: (x, y) => y ?? x,
    default: () => ""
  },
  complete: {
    value: (x, y) => y ?? x,
    default: () => false
  }
};

// Document generation function
async function generateDocument(state) {
  console.log(`[Local Agent] Starting generation for task: ${state.task || 'No task'}`);
  
  // Initialize document ID if not set
  if (!state.document_id) {
    state.document_id = `doc-${uuidv4().substring(0, 8)}`;
    console.log(`[Local Agent] Created document ID: ${state.document_id}`);
  }
  
  // Extract account info
  const accountName = state.account_data?.name || "Unknown Company";
  const accountInfo = state.account_data || {};
  
  // Create prompt
  const prompt = `Generate a professional document for the following request:

Task: ${state.task || 'Create a document'}

Client Information:
- Company: ${accountName}
- Contact: ${accountInfo.contact || 'N/A'}
- Stage: ${accountInfo.stage || 'N/A'}
- Value: ${accountInfo.value || 'N/A'}

Please create a concise, professional document that addresses the task.
Format it with clear sections and markdown formatting.`;

  console.log(`[Local Agent] Calling LLM...`);
  
  try {
    // Make the LLM call
    const response = await llm.invoke(prompt);
    
    // Update state
    return {
      ...state,
      document_content: `# Document for ${accountName}\n\n${response.content}`,
      complete: true
    };
  } catch (error) {
    console.error(`[Local Agent] Error generating document:`, error);
    return {
      ...state,
      document_content: `Error generating document: ${error.message}`,
      complete: true
    };
  }
}

// Build the graph
function buildGraph() {
  const workflow = new StateGraph({
    channels: agentStateChannels
  });
  
  // Add nodes
  workflow.addNode("generate", generateDocument);
  
  // Set entry point
  workflow.setEntryPoint("generate");
  
  // Add edges
  workflow.addEdge("generate", END);
  
  return workflow.compile();
}

// API Handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, accountData } = req.body;

  try {
    // Build and run the graph
    const graph = buildGraph();
    
    // Initial state
    const initialState = {
      task: prompt,
      account_data: accountData,
      document_id: null,
      document_content: "",
      complete: false
    };
    
    console.log('[Local Agent] Running graph with initial state:', initialState);
    
    // Run the graph
    const result = await graph.invoke(initialState);
    
    console.log('[Local Agent] Graph execution complete');
    console.log('[Local Agent] Document ID:', result.document_id);
    console.log('[Local Agent] Document length:', result.document_content?.length);
    
    // Return the result
    res.status(200).json({
      success: true,
      documentId: result.document_id,
      content: result.document_content,
      complete: result.complete
    });
    
  } catch (error) {
    console.error('[Local Agent] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

export const config = {
  maxDuration: 60, // 1 minute timeout
};
```

### 3. Add SSE Support (Optional)

If you want to maintain streaming capabilities, create `/api/agent/generate-stream.js`:

```javascript
// Similar setup as above, but with SSE streaming

export default async function handler(req, res) {
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Stream events as the graph executes
  // Implementation details...
}
```

### 4. Update Frontend Integration

Update the AI Chat service to use the new local endpoint:

```javascript
// In useAIChat.js or similar
const response = await fetch('/api/agent/generate-local', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    prompt: message,
    accountData: accountData
  })
});

const data = await response.json();
if (data.success) {
  // Display the document content
  setDocumentContent(data.content);
}
```

### 5. Environment Variables

Add to `.env.local`:
```
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-4
```

### 6. Remove Cloud Dependencies

After migration is complete:
- Remove `@langchain/langgraph-sdk` from package.json
- Delete `/api/langgraph/` directory (cloud proxy endpoints)
- Remove LangGraph Cloud environment variables
- Update any remaining cloud references

## Migration Benefits

1. **Simplified Architecture**: No external service dependencies
2. **Better Performance**: No network hops to LangGraph Cloud
3. **Easier Debugging**: All logs in Vercel Functions logs
4. **Cost Reduction**: No LangGraph Cloud usage costs
5. **Full Control**: Modify agent behavior without redeployment
6. **Consistent Environment**: Everything runs in Vercel

## Testing Plan

1. Test document generation with various prompts
2. Verify error handling
3. Test with different account data
4. Performance comparison with cloud version
5. Verify SSE streaming if implemented

## Rollback Plan

If issues arise:
1. Keep cloud endpoints available during transition
2. Use feature flags to switch between local/cloud
3. Maintain cloud deployment until local is stable

## Future Enhancements

Once migrated:
1. Add more sophisticated graph nodes
2. Implement memory/checkpointing locally
3. Add tool usage (search, calculations, etc.)
4. Implement human-in-the-loop features
5. Add parallel processing nodes

## Notes

- The JavaScript LangGraph API is similar to Python but with some syntax differences
- State management uses channels instead of TypedDict
- Async/await patterns replace Python's async def
- Consider using TypeScript for better type safety