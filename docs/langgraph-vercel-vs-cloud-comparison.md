# Running LangGraph on Vercel Fluid Compute vs LangGraph Cloud

## Overview

This document compares deploying your LangGraph agent application on Vercel's Fluid Compute infrastructure versus using LangGraph Cloud (now LangGraph Platform). Both approaches run the same LangGraph code but with different infrastructure capabilities and limitations.

## Deployment Architecture Comparison

### LangGraph on Vercel Fluid Compute
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  Vercel Function│────▶│   Your Own   │────▶│  External   │
│  (LangGraph)    │     │   Redis/DB   │     │  Storage    │
└─────────────────┘     └──────────────┘     └─────────────┘
         │                                            │
         └────────────────────────────────────────────┘
                    Manual State Management
```

### LangGraph Cloud/Platform
```
┌─────────────────┐     ┌──────────────┐     ┌─────────────┐
│  LangGraph API  │────▶│   Built-in   │────▶│  Managed    │
│   (Managed)     │     │ Checkpointer │     │ Persistence │
└─────────────────┘     └──────────────┘     └─────────────┘
         │                                            │
         └────────────────────────────────────────────┘
                  Automatic State Management
```

## Key Limitations When Running LangGraph on Vercel

### 1. Checkpointing & State Persistence

| Feature | LangGraph on Vercel | LangGraph Cloud |
|---------|-------------------|-----------------|
| **Built-in Checkpointer** | ❌ Must implement your own | ✅ Automatic checkpointing |
| **State Storage** | Manual setup (Redis/PostgreSQL) | Managed persistence |
| **Thread Management** | DIY implementation | Native thread API |
| **State Rollback** | Custom implementation required | Built-in time-travel |
| **Cross-Request State** | Complex to maintain | Automatic |

**Vercel Implementation Required:**
```python
# You need to implement your own checkpointer
class VercelCheckpointer(BaseCheckpointer):
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def put(self, checkpoint, thread_id):
        # Custom implementation to store in Redis
        pass
    
    async def get(self, thread_id):
        # Custom implementation to retrieve from Redis
        pass
```

### 2. Execution Time Constraints

| Aspect | LangGraph on Vercel | LangGraph Cloud |
|--------|-------------------|-----------------|
| **Max Execution Time** | 14 minutes (paid plans) | Unlimited with interrupts |
| **Long-Running Workflows** | Must chunk into multiple requests | Native support |
| **Human-in-the-Loop Pauses** | Limited by timeout | Can pause indefinitely |
| **Background Processing** | Requires job queue setup | Built-in async execution |

### 3. Human-in-the-Loop Implementation

**On Vercel (Manual Implementation):**
```python
# Complex workaround needed
async def handle_human_interrupt(state, thread_id):
    # Save state to external storage
    await save_to_redis(state, thread_id)
    
    # Return webhook URL for continuation
    return {
        "status": "awaiting_human_input",
        "continue_url": f"/api/continue/{thread_id}"
    }
    
# Separate endpoint to resume
async def continue_execution(thread_id, human_input):
    # Retrieve state
    state = await load_from_redis(thread_id)
    # Resume graph execution
```

**On LangGraph Cloud:**
```python
# Built-in support
graph = graph.compile(interrupt_before=["human_review_node"])
# Automatically handles pausing and resuming
```

### 4. API & Developer Experience

| Feature | LangGraph on Vercel | LangGraph Cloud |
|---------|-------------------|-----------------|
| **Graph Management API** | Build your own | REST API provided |
| **Streaming Support** | Manual SSE implementation | Built-in streaming |
| **Monitoring** | DIY logging/tracing | Integrated with LangSmith |
| **Visual Debugging** | No built-in tools | LangGraph Studio |
| **Cron/Scheduled Runs** | Vercel cron jobs | Native scheduling |

### 5. Infrastructure Complexity

**Additional Services Needed on Vercel:**
- Redis or PostgreSQL for state persistence
- S3/Blob storage for large state objects
- Queue service (BullMQ/SQS) for long-running tasks
- Custom API endpoints for graph management
- Webhook service for human-in-the-loop
- Monitoring and observability stack

**LangGraph Cloud Provides:**
- All infrastructure managed
- Built-in persistence layer
- Automatic scaling
- Integrated monitoring
- Human-in-the-loop APIs

## Cost Analysis

### Vercel Deployment Costs
- Vercel Fluid Compute: ~$0.15/GB-hour
- Redis/Upstash: $0.2/100K commands
- PostgreSQL: ~$20-50/month
- Additional services: ~$50-100/month
- **Total**: $100-200/month + usage

### LangGraph Cloud Pricing
- Self-Hosted Lite: Free up to 1M nodes/month
- Cloud Standard: $0.01 per 1K nodes
- Includes all infrastructure
- **Total**: $0-100/month based on usage

## Implementation Comparison

### Minimal LangGraph on Vercel Setup

```python
# app/api/graph/route.ts
import { NextRequest } from 'next/server';
import { createGraph } from './graph';
import { RedisCheckpointer } from './checkpointer';

export async function POST(req: NextRequest) {
  const { input, thread_id } = await req.json();
  
  // Manual checkpointer setup
  const checkpointer = new RedisCheckpointer();
  const graph = createGraph(checkpointer);
  
  try {
    // Execute with timeout handling
    const result = await Promise.race([
      graph.invoke(input, { thread_id }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 840000) // 14 min
      )
    ]);
    
    return Response.json(result);
  } catch (error) {
    if (error.message === 'Timeout') {
      // Save state and return continuation token
      await checkpointer.put(graph.getState(), thread_id);
      return Response.json({ 
        status: 'timeout',
        continue_token: thread_id 
      });
    }
    throw error;
  }
}
```

### LangGraph Cloud Setup

```python
# Simply deploy your graph
langgraph deploy my-agent
# Everything else is handled
```

## Specific Limitations for Sales Document Generation

### 1. Document Generation Workflow
- **Vercel**: 14-minute limit makes complex multi-stage generation risky
- **Cloud**: Can generate, pause for review, and continue over days

### 2. Human Review Cycles
- **Vercel**: Must implement complex webhook/polling system
- **Cloud**: Native interrupt points with simple API

### 3. State Management
- **Vercel**: Risk of state loss between function invocations
- **Cloud**: Guaranteed state persistence with versioning

### 4. Parallel Processing
- **Vercel**: Limited by function concurrency limits
- **Cloud**: Built-in parallel node execution

### 5. Debugging Production Issues
- **Vercel**: Need custom logging and state inspection tools
- **Cloud**: LangGraph Studio for visual debugging

## Recommendations

### Use Vercel if:
- Your workflows complete in <10 minutes reliably
- You don't need human-in-the-loop features
- You have existing Vercel infrastructure
- You're comfortable building state management
- Cost is the primary concern for low usage

### Use LangGraph Cloud if:
- You need reliable long-running workflows
- Human review cycles are critical
- You want faster development velocity
- You need production debugging tools
- You want managed infrastructure

### Hybrid Approach
Consider using Vercel for simple, fast operations and LangGraph Cloud for complex workflows:
```typescript
// Quick operations on Vercel
async function quickAnalysis(input) {
  return await vercelGraph.invoke(input);
}

// Complex workflows on LangGraph Cloud
async function complexDocumentGeneration(input) {
  return await langGraphAPI.runs.create(input);
}
```

## Conclusion

While it's technically possible to run LangGraph on Vercel's Fluid Compute, you lose many of the key features that make LangGraph powerful for complex agentic workflows. The 14-minute execution limit and lack of built-in state management make it particularly challenging for sales document generation use cases that require human review cycles and long-running processes.

For production sales engineering agent applications, LangGraph Cloud's managed infrastructure and native features justify the cost difference by significantly reducing development complexity and improving reliability.