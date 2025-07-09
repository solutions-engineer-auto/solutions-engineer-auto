import { Client } from '@langchain/langgraph-sdk';

export default async function handler(req, res) {
  console.log('[API Start] Handler called, method:', req.method);
  
  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse body
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  
  console.log('[API Start] Raw body:', body);
  
  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (e) {
    console.error('[API Start] Failed to parse body:', e);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    return;
  }
  
  const { prompt, accountData, userId } = parsedBody;
  console.log('[API Start] Parsed request:', { prompt, accountData, userId });

  try {
    console.log('[API Start] Environment vars:', {
      apiUrl: process.env.LANGGRAPH_API_URL,
      hasApiKey: !!process.env.LANGGRAPH_API_KEY
    });
    
    // Initialize LangGraph client
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });
    
    console.log('[API Start] Creating thread...');
    const thread = await client.threads.create();
    console.log('[API Start] Thread created:', thread.thread_id);
    
    console.log('[API Start] Creating run...');
    const documentId = `doc-${Date.now()}`;
    const run = await client.runs.create(thread.thread_id, 'document_generator', {
      input: { 
        task: prompt, 
        account_data: accountData,
        user_id: userId,  // Pass user context for document ownership
        document_id: documentId,
        thread_id: thread.thread_id,  // Include for tracking
        run_id: null  // Will be set by agent
      },
      multitaskStrategy: 'enqueue'
    });
    
    console.log('[API Start] Run created:', {
      runId: run.run_id,
      status: run.status,
      metadata: run.metadata
    });
    
    // Update run_id in input for agent to use
    run.input.run_id = run.run_id;
    
    // Return the IDs for realtime subscription
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      threadId: thread.thread_id,
      runId: run.run_id,
      documentId: documentId
    }));
    
  } catch (error) {
    console.error('[API Start] Error:', error);
    console.error('[API Start] Error details:', {
      name: error.name,
      message: error.message,
      response: error.response,
      status: error.status
    });
    
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      success: false,
      error: error.message,
      details: error.response?.data || error.statusText || 'Unknown error'
    }));
  }
}

export const config = {
  maxDuration: 60, // 1 minute
};