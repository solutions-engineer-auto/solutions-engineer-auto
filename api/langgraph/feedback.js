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
  
  const { threadId, feedback } = parsedBody;

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

    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({
      runId: run.run_id,
      message: 'Feedback sent successfully'
    }));
  } catch (error) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error.message }));
  }
}