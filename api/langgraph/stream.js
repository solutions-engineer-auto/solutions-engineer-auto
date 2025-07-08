import { Client } from '@langchain/langgraph-sdk';

export default async function handler(req, res) {
  console.log('[API Stream] Handler called, method:', req.method);
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  
  console.log('[API Stream] Raw body:', body);
  
  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (e) {
    console.error('[API Stream] Failed to parse body:', e);
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  
  const { prompt, accountData } = parsedBody;
  console.log('[API Stream] Parsed request:', { prompt, accountData });
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Content-Encoding': 'none',
    'Access-Control-Allow-Origin': '*',
  });

  try {
    console.log('[API Stream] Environment vars:', {
      apiUrl: process.env.LANGGRAPH_API_URL,
      hasApiKey: !!process.env.LANGGRAPH_API_KEY,
      apiKeyPrefix: process.env.LANGGRAPH_API_KEY ? process.env.LANGGRAPH_API_KEY.substring(0, 10) + '...' : 'NOT SET'
    });
    
    // Initialize LangGraph client
    console.log('[API Stream] Initializing LangGraph client...');
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });
    console.log('[API Stream] Client initialized successfully');

    console.log('[API Stream] Creating thread...');
    // Create thread and run
    const thread = await client.threads.create();
    console.log('[API Stream] Thread created:', thread.thread_id);
    
    console.log('[API Stream] Creating run with assistant_id: document_generator');
    const run = await client.runs.create(thread.thread_id, 'document_generator', {
      input: { 
        task: prompt, 
        account_data: accountData,
        document_id: `doc-${Date.now()}`
      },
      multitaskStrategy: 'enqueue'
    });
    console.log('[API Stream] Run created:', run.run_id);
    console.log('[API Stream] Run status:', run.status);
    console.log('[API Stream] Run metadata:', run.metadata);

    // Send initial event
    const startEvent = {
      type: 'started',
      threadId: thread.thread_id,
      runId: run.run_id,
      runStatus: run.status
    };
    console.log('[API Stream] Sending start event:', startEvent);
    res.write(`data: ${JSON.stringify(startEvent)}\n\n`);

    // Join and stream LangGraph events
    console.log('[API Stream] Joining stream...');
    console.log('[API Stream] Stream params:', {
      threadId: thread.thread_id,
      runId: run.run_id,
      streamMode: ['events', 'updates', 'values']
    });
    
    // Add timeout to detect if stream is hanging
    const streamTimeout = setTimeout(() => {
      console.log('[API Stream] WARNING: No events received in 10 seconds');
    }, 10000);
    
    const eventStream = client.runs.joinStream(thread.thread_id, run.run_id, {
      streamMode: ['events', 'updates', 'values']
    });
    
    let eventCount = 0;
    let lastEventTime = Date.now();
    
    for await (const event of eventStream) {
      clearTimeout(streamTimeout); // Clear timeout on first event
      eventCount++;
      const timeSinceLastEvent = Date.now() - lastEventTime;
      lastEventTime = Date.now();
      
      console.log(`[API Stream] Event #${eventCount} (${timeSinceLastEvent}ms since last):`, {
        event: event.event,
        dataKeys: Object.keys(event.data || {}),
        data: event.data
      });
      
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

    console.log(`[API Stream] Stream completed. Total events: ${eventCount}`);
    // Send completion
    res.write(`data: ${JSON.stringify({ type: 'complete' })}\n\n`);
    res.write('data: [DONE]\n\n');
    
  } catch (error) {
    console.error('[SSE Stream Error]:', error);
    console.error('[SSE Stream Error] Stack:', error.stack);
    console.error('[SSE Stream Error] Details:', {
      name: error.name,
      message: error.message,
      response: error.response,
      status: error.status,
      statusText: error.statusText
    });
    
    res.write(`data: ${JSON.stringify({ 
      type: 'error', 
      message: error.message,
      details: error.response?.data || error.statusText || 'Unknown error'
    })}\n\n`);
  } finally {
    console.log('[API Stream] Closing SSE connection');
    res.end();
  }
}

export const config = {
  maxDuration: 300, // 5 minutes (can extend to 2700 for 45 min)
};