# LangGraph Integration Plan: SSE with Vercel Fluid Functions

## Overview

This plan outlines how to integrate LangGraph Cloud with your React frontend using Server-Sent Events (SSE) through Vercel Functions. With Fluid Functions supporting up to 45 minutes of execution time, SSE provides real-time updates for long-running agent operations.

## Architecture

```
React App → Vercel Function (SSE) → LangGraph Cloud
    ↓              ↓                      ↓
EventSource → Stream events → Real-time updates
```

## Why This Approach?

### Current Issues
- Direct browser-to-LangGraph API calls fail due to CORS
- API keys exposed in browser is a security risk
- LangGraph Cloud APIs are designed for server-side use

### Solution Benefits
- ✅ No CORS issues - all requests go through your domain
- ✅ Secure API key storage on server
- ✅ Real-time updates via SSE
- ✅ Up to 45 minutes execution time with Fluid Functions
- ✅ Works locally with vite-plugin-vercel-api
- ✅ Production-ready architecture

## Implementation Plan

### 1. Local Development Setup

For local development, we use Vite's built-in proxy configuration to handle API routes:

Update `vite.config.js`:

```javascript
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/langgraph/stream': {
          target: 'http://localhost:5173',
          bypass: async (req, res) => {
            if (req.method === 'POST') {
              process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
              process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              const streamHandler = await import('./api/langgraph/stream.js')
              await streamHandler.default(req, res)
              return true
            }
          }
        },
        // Similar configuration for other endpoints...
      }
    }
  }
})
```

### 2. Create Directory Structure

```
your-project/
├── src/              # React app
├── api/              # Vercel functions
│   └── langgraph/
│       ├── stream.js    # SSE streaming endpoint
│       └── feedback.js  # Send user feedback
├── .env              # Server-side environment variables
└── .env.local        # Client-side environment variables
```

### 3. Environment Variables

Create `.env` for server-side variables:

```bash
# .env (server-side only, not exposed to browser)
LANGGRAPH_API_URL=https://your-deployment.langgraph.app
LANGGRAPH_API_KEY=lsv2_sk_xxxxx
```

Update `.env.local` for client-side:

```bash
# .env.local (can be exposed to browser)
VITE_API_URL=/api/langgraph
```

### 4. Create SSE Streaming Endpoint

Create `api/langgraph/stream.js`:

```javascript
import { Client } from '@langchain/langgraph-sdk';

export const config = {
  maxDuration: 300, // 5 minutes (can extend to 2700 for 45 min)
};

export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, accountData } = req.body;
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Content-Encoding': 'none',
  });

  try {
    // Initialize LangGraph client
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });

    // Create thread and run
    const thread = await client.threads.create();
    const run = await client.runs.create(thread.thread_id, 'document_generator', {
      input: { 
        task: prompt, 
        account_data: accountData,
        document_id: `doc-${Date.now()}`
      },
      multitaskStrategy: 'enqueue'
    });

    // Send initial event
    res.write(`data: ${JSON.stringify({
      type: 'started',
      threadId: thread.thread_id,
      runId: run.run_id
    })}\n\n`);

    // Join and stream LangGraph events
    const eventStream = client.runs.joinStream(thread.thread_id, run.run_id, {
      streamMode: ['events', 'updates', 'values']
    });
    
    for await (const event of eventStream) {
      // Send event to client
      res.write(`data: ${JSON.stringify({
        type: event.event,
        data: event.data
      })}\n\n`);
      
      // Keep-alive ping every 30 seconds
      if (Date.now() % 30000 < 1000) {
        res.write(':ping\n\n');
      }
    }

    // Send completion
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.write('data: [DONE]\n\n');
    
  } catch (error) {
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message 
    })}\n\n`);
  } finally {
    res.end();
  }
}
```

### 5. Create Feedback Endpoint

Create `api/langgraph/feedback.js`:

```javascript
import { Client } from '@langchain/langgraph-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId, feedback } = req.body;

  try {
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });

    const run = await client.runs.create(threadId, 'document_generator', {
      input: {
        human_feedback: feedback,
        task: feedback
      },
      multitaskStrategy: 'enqueue'
    });

    res.status(200).json({
      runId: run.run_id,
      message: 'Feedback sent successfully'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

### 6. Create Frontend SSE Client

Create `src/services/langGraphSSE.js`:

```javascript
export class LangGraphSSE {
  constructor(onUpdate, onActivity, onError) {
    this.onUpdate = onUpdate;
    this.onActivity = onActivity;
    this.onError = onError;
    this.eventSource = null;
    this.threadId = null;
  }

  async start(prompt, accountData) {
    // Close existing connection
    this.close();
    
    // Start SSE stream with POST request
    const response = await fetch('/api/langgraph/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, accountData })
    });

    if (!response.ok) {
      throw new Error('Failed to start stream');
    }

    // Read response body to set up SSE
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    // Process SSE stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const text = decoder.decode(value);
      const lines = text.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            this.close();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            this.handleEvent(parsed);
          } catch (e) {
            console.error('Failed to parse SSE data:', e);
          }
        }
      }
    }
  }

  handleEvent(data) {
    // Store threadId for feedback
    if (data.type === 'started' && data.threadId) {
      this.threadId = data.threadId;
    }

    switch (data.type) {
      case 'values':
        // Update document content
        if (data.data?.document_content) {
          this.onUpdate?.({
            content: data.data.document_content,
            sections: data.data.document_sections || [],
            complete: data.data.complete || false
          });
        }
        break;
        
      case 'events':
      case 'updates':
        // Show activity updates
        this.onActivity?.({
          type: data.data?.event || 'status',
          message: data.data?.message || 'Processing...',
          action: data.data?.next_action
        });
        break;
        
      case 'complete':
        this.onActivity?.(null);
        break;
        
      case 'error':
        this.onError?.(new Error(data.message));
        break;
    }
  }

  async sendFeedback(feedback) {
    if (!this.threadId) {
      throw new Error('No active thread');
    }

    const response = await fetch('/api/langgraph/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: this.threadId,
        feedback
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send feedback');
    }

    return response.json();
  }

  close() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}
```

### 7. Update useAIChat Hook

Update `src/components/AIChat/useAIChat.js`:

```javascript
import { useState, useCallback, useRef, useEffect } from 'react';
import { LangGraphSSE } from '../../services/langGraphSSE';

// ... existing imports and mock data ...

export const useAIChat = (mode = 'mock', threadId = null, onThreadCreate = null) => {
  // ... existing state ...
  const sseClientRef = useRef(null);

  const sendMessage = useCallback(async (content, accountData = null) => {
    if (!content.trim() || isStreaming) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Start streaming
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      if (mode === 'agent') {
        // Agent mode - use SSE
        const sseClient = new LangGraphSSE(
          // onUpdate - handle content updates
          (update) => {
            setStreamingMessage(update.content || '');
          },
          // onActivity - handle status updates
          (activity) => {
            if (activity) {
              setCurrentActivity({
                type: activity.type || 'status',
                message: activity.message || 'Processing...'
              });
            } else {
              setCurrentActivity(null);
            }
          },
          // onError
          (error) => {
            console.error('SSE error:', error);
            setCurrentActivity({ 
              type: 'error', 
              message: error.message 
            });
          }
        );

        sseClientRef.current = sseClient;
        
        // Start streaming
        await sseClient.start(content, accountData || { name: 'Chat User' });
        
        // Wait for completion
        // The SSE client will handle all updates
        
      } else {
        // Mock mode - keep existing behavior
        await simulateActivities();
        const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
        const fullResponse = await simulateStreaming(response);
        
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      
    } catch (error) {
      console.error('Chat error:', error);
      setCurrentActivity({ 
        type: 'error', 
        message: error.message || 'Something went wrong...' 
      });
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
      setTimeout(() => setCurrentActivity(null), 3000);
    }
  }, [isStreaming, mode, accountData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sseClientRef.current?.close();
    };
  }, []);

  // ... rest of existing code ...
};
```

## Testing

### Local Development

1. Install dependencies:
   ```bash
   npm install @langchain/langgraph-sdk
   ```

2. Restart the development server to apply Vite config changes:
   ```bash
   npm run dev
   ```

3. Test the integration:
   - Open the app at http://localhost:5173
   - Toggle to "Agent" mode in the AI chat
   - Send a message
   - Watch real-time updates stream in

### Production Deployment

1. Set environment variables in Vercel:
   - `LANGGRAPH_API_URL`
   - `LANGGRAPH_API_KEY`

2. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

## Migration Steps

1. ✅ Set up local API routing with Vite proxy
2. ✅ Create `/api/langgraph/` directory structure
3. ✅ Implement SSE streaming endpoint
4. ✅ Create SSE client helper
5. ✅ Update useAIChat to use SSE
6. ✅ Remove direct SDK usage from frontend
7. ⏳ Test locally (restart dev server needed)
8. ⏳ Deploy to Vercel

## Implementation Status

**Current Status**: Implementation complete, ready for testing.

**Next Steps**:
1. Restart the development server (`npm run dev`)
2. Test the SSE integration in agent mode
3. Deploy to Vercel for production testing

**Note**: The implementation uses Vite's proxy configuration for local development. For production deployment on Vercel, the `/api` routes will be automatically handled by Vercel Functions.

## Advantages

- **Real-time updates**: No polling delays
- **Efficient**: Only sends when there's new data
- **Long-running support**: Up to 45 minutes with Fluid Functions
- **Automatic reconnection**: Built-in SSE reconnection
- **Better UX**: Smooth, streaming experience
- **Secure**: API keys never exposed to browser
- **No CORS issues**: All requests through your domain

## Future Enhancements

1. Add reconnection logic for dropped connections
2. Implement progress indicators based on agent state
3. Add ability to cancel long-running operations
4. Store conversation history in Supabase
5. Add rate limiting and authentication