import { Client } from '@langchain/langgraph-sdk';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { threadId, runId } = req.query || {};
  
  if (!threadId || !runId) {
    return res.status(400).json({ error: 'Missing threadId or runId query parameters' });
  }

  try {
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });

    // Get run details
    const run = await client.runs.get(threadId, runId);
    
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      runId: run.run_id,
      status: run.status,
      createdAt: run.created_at,
      metadata: run.metadata,
      error: run.error,
      currentNodeId: run.current_node_id
    }));
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}