import { Client } from '@langchain/langgraph-sdk';

export default async function handler(req, res) {
  console.log('[API Poll] Handler called, method:', req.method);
  console.log('[API Poll] Request URL:', req.url);
  console.log('[API Poll] Request headers host:', req.headers.host);
  
  if (req.method !== 'GET') {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parse query parameters from URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const threadId = url.searchParams.get('threadId');
  const runId = url.searchParams.get('runId');
  
  if (!threadId || !runId) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 400;
    res.end(JSON.stringify({ error: 'Missing threadId or runId query parameters' }));
    return;
  }

  console.log('[API Poll] Polling for:', { threadId, runId });

  try {
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });

    // Get run details
    console.log('[API Poll] Checking run status...');
    const run = await client.runs.get(threadId, runId);
    
    console.log('[API Poll] Run status:', {
      runId: run.run_id,
      status: run.status,
      error: run.error,
      currentNodeId: run.current_node_id
    });
    
    // Prepare response
    const response = {
      status: run.status,
      error: run.error,
      complete: false,
      document: null,
      metadata: run.metadata
    };
    
    // Check if run is complete
    if (run.status === 'success' || run.status === 'error' || run.status === 'timeout') {
      response.complete = true;
      
      // If successful, get the thread state for document content
      if (run.status === 'success') {
        try {
          console.log('[API Poll] Run successful, fetching thread state...');
          const threadState = await client.threads.get(threadId);
          
          console.log('[API Poll] Thread state:', {
            hasValues: !!threadState.values,
            valueKeys: threadState.values ? Object.keys(threadState.values) : [],
            hasDocumentContent: !!threadState.values?.document_content
          });
          
          if (threadState.values?.document_content) {
            response.document = threadState.values.document_content;
            response.documentId = threadState.values.document_id;
            console.log('[API Poll] Document found, length:', response.document.length);
          } else {
            console.log('[API Poll] No document content in thread state');
            // Log the full values for debugging
            console.log('[API Poll] Full thread values:', threadState.values);
          }
        } catch (threadError) {
          console.error('[API Poll] Error fetching thread state:', threadError);
          response.error = `Run succeeded but couldn't fetch document: ${threadError.message}`;
        }
      }
    }
    
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(response));
    
  } catch (error) {
    console.error('[API Poll] Error:', error);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ 
      error: error.message,
      complete: true // Stop polling on error
    }));
  }
}

export const config = {
  maxDuration: 30, // 30 seconds
};