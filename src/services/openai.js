import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, use a backend proxy
});

// Exponential backoff configuration
const RETRY_CONFIG = {
  maxRetries: 5,
  initialDelay: 1000, // 1 second
  maxDelay: 60000, // 60 seconds
  backoffMultiplier: 2,
  jitter: true
};

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 20,
  tokensPerMinute: 40000
};

// Keep track of requests for rate limiting
let requestQueue = [];
// let tokenUsage = 0; // TODO: Implement token usage tracking
let lastResetTime = Date.now();

/**
 * Sleep function for delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate exponential backoff delay
 */
const getBackoffDelay = (retryCount) => {
  const delay = Math.min(
    RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, retryCount),
    RETRY_CONFIG.maxDelay
  );
  
  if (RETRY_CONFIG.jitter) {
    return delay * (0.5 + Math.random() * 0.5);
  }
  
  return delay;
};

/**
 * Check and update rate limits
 */
const checkRateLimit = async () => {
  const now = Date.now();
  const timeSinceReset = now - lastResetTime;
  
  // Reset counters every minute
  if (timeSinceReset >= 60000) {
    requestQueue = [];
    // tokenUsage = 0; // TODO: Implement token usage tracking
    lastResetTime = now;
  }
  
  // Remove old requests from queue
  requestQueue = requestQueue.filter(time => now - time < 60000);
  
  // Check if we're at the limit
  if (requestQueue.length >= RATE_LIMIT.requestsPerMinute) {
    const oldestRequest = requestQueue[0];
    const waitTime = 60000 - (now - oldestRequest) + 100; // Add 100ms buffer
    await sleep(waitTime);
  }
  
  requestQueue.push(now);
};

/**
 * Stream chat completion with error handling and retry logic
 */
export const streamChatCompletion = async ({
  messages,
  onChunk,
  onActivity,
  onError,
  onComplete,
  model = 'gpt-4o-mini',
  temperature = 0.7,
  maxTokens = 2000
}) => {
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount <= RETRY_CONFIG.maxRetries) {
    try {
      // Check rate limit before making request
      await checkRateLimit();
      
      // Show thinking activity
      if (onActivity) {
        onActivity({ type: 'thinking', message: 'Thinking...' });
      }
      
      // Make the API call with streaming
      const stream = await openai.chat.completions.create({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true
      });
      
      let fullContent = '';
      
      // Show generating activity
      if (onActivity) {
        onActivity({ type: 'generating', message: 'Generating response...' });
      }
      
      // Process the stream
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          if (onChunk) {
            onChunk(content);
          }
        }
      }
      
      // Clear activity and complete
      if (onActivity) {
        onActivity(null);
      }
      
      if (onComplete) {
        onComplete(fullContent);
      }
      
      return fullContent;
      
    } catch (error) {
      lastError = error;
      console.error('OpenAI API error:', error);
      
      // Check if it's a rate limit error
      if (error.status === 429 || error.message?.includes('rate limit')) {
        retryCount++;
        
        if (retryCount <= RETRY_CONFIG.maxRetries) {
          const delay = getBackoffDelay(retryCount);
          console.log(`Rate limited. Retrying in ${delay}ms (attempt ${retryCount}/${RETRY_CONFIG.maxRetries})`);
          
          if (onActivity) {
            onActivity({ 
              type: 'error', 
              message: `Rate limited. Retrying in ${Math.round(delay / 1000)}s...` 
            });
          }
          
          await sleep(delay);
          continue;
        }
      }
      
      // For other errors, throw immediately
      if (onError) {
        onError(error);
      }
      
      throw error;
    }
  }
  
  // If we've exhausted all retries
  const error = new Error(`Maximum retries (${RETRY_CONFIG.maxRetries}) exceeded. Last error: ${lastError?.message}`);
  if (onError) {
    onError(error);
  }
  throw error;
};

/**
 * Generate a document with AI
 */
export const generateDocument = async ({
  prompt,
  documentType,
  context,
  onProgress,
  model = 'gpt-4o-mini',
  temperature = 0.7
}) => {
  const systemPrompt = `You are an expert document generator. Create professional, well-structured HTML documents.
When generating documents:
1. Use semantic HTML tags (h1, h2, h3, p, ul, ol, strong, em, etc.)
2. Structure content logically with clear sections
3. Make content comprehensive and detailed
4. Ensure proper formatting for readability
5. Include relevant details based on the document type

${documentType ? `Document Type: ${documentType}` : ''}
${context ? `Context: ${context}` : ''}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ];
  
  let fullContent = '';
  
  const response = await streamChatCompletion({
    messages,
    model,
    temperature,
    maxTokens: 4000, // Larger for document generation
    onChunk: (chunk) => {
      fullContent += chunk;
      if (onProgress) {
        onProgress(fullContent);
      }
    },
    onActivity: (activity) => {
      if (onProgress && activity) {
        onProgress(null, activity);
      }
    }
  });
  
  return response;
};

/**
 * Modify existing document content
 */
export const modifyDocument = async ({
  currentContent,
  instruction,
  selectedText,
  onProgress,
  model = 'gpt-4o-mini',
  temperature = 0.7
}) => {
  const systemPrompt = `You are an expert document editor. Modify the given HTML document based on the user's instructions.
Maintain the existing structure and style while making the requested changes.
If specific text is selected, focus your modifications on that section.
Return the complete modified HTML document.`;

  const userPrompt = `Current document content:
${currentContent}

${selectedText ? `Selected text to modify: "${selectedText}"` : ''}

Instruction: ${instruction}`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];
  
  return await streamChatCompletion({
    messages,
    model,
    temperature,
    maxTokens: 4000,
    onChunk: onProgress?.onChunk,
    onActivity: onProgress?.onActivity
  });
};

/**
 * Check if OpenAI API key is configured
 */
export const isOpenAIConfigured = () => {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
};

/**
 * Test the OpenAI connection
 */
export const testOpenAIConnection = async () => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Say "Connection successful!" in 5 words or less.' }],
      max_tokens: 10
    });
    
    return {
      success: true,
      message: response.choices[0]?.message?.content || 'Connection successful!'
    };
  } catch (error) {
    return {
      success: false,
      message: error.message || 'Failed to connect to OpenAI'
    };
  }
}; 