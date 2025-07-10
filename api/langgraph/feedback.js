import { Client } from '@langchain/langgraph-sdk';

/**
 * Universal body parser that works in both Vite and Vercel environments
 */
async function getRequestBody(req) {
  // Check if body is already parsed (Vercel often does this)
  if (req.body) {
    return typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  }
  
  // Check if request is already aborted
  if (req.aborted || req.destroyed) {
    throw new Error('Request aborted');
  }
  
  // Otherwise, parse it manually
  return new Promise((resolve, reject) => {
    let body = '';
    
    // Handle connection close
    req.on('close', () => {
      if (!req.complete) {
        reject(new Error('Request aborted'));
      }
    });
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error('Invalid JSON body'));
      }
    });
    
    req.on('error', (err) => {
      reject(err);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body using universal parser
  let parsedBody;
  try {
    parsedBody = await getRequestBody(req);
  } catch (e) {
    // Check if response was already sent or connection closed
    if (!res.headersSent && !res.destroyed) {
      return res.status(400).json({ error: e.message });
    }
    return;
  }
  
  const { threadId, feedback, userId, documentId } = parsedBody;

  try {
    const client = new Client({
      apiUrl: process.env.LANGGRAPH_API_URL,
      apiKey: process.env.LANGGRAPH_API_KEY
    });

    const run = await client.runs.create(threadId, 'document_generator', {
      input: {
        human_feedback: feedback,
        task: feedback,
        user_id: userId,
        document_id: documentId,
        thread_id: threadId,
        run_id: null  // Will be set after creation
      },
      multitaskStrategy: 'enqueue'
    });

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      runId: run.run_id
    }));
  } catch (error) {
    // Check if response was already sent or connection closed
    if (!res.headersSent && !res.destroyed) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify({ error: error.message }));
    }
  }
}