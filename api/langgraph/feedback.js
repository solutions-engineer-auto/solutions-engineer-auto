import { Client } from '@langchain/langgraph-sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Parse body
  let body = '';
  for await (const chunk of req) {
    body += chunk;
  }
  
  let parsedBody;
  try {
    parsedBody = JSON.parse(body);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
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
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}