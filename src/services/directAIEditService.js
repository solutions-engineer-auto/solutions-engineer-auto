/**
 * Direct AI Edit Service - Uses OpenAI API directly for quick edit suggestions
 * This bypasses the full document generation system for simple text edits
 */

// Try multiple possible environment variable names
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || 
                       import.meta.env.VITE_OPENAPI_KEY || 
                       import.meta.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Token estimation constants
const AVG_CHARS_PER_TOKEN = 4;
const MIN_RESPONSE_TOKENS = 500;
const MAX_INPUT_TOKENS = 30000; // ~120K characters
const MODEL_CONTEXT_WINDOW = 128000; // gpt-4o-mini context window
const MODEL_MAX_OUTPUT = 16000; // gpt-4o-mini max output tokens
const SYSTEM_PROMPT_TOKENS = 250; // Approximate system prompt size

/**
 * Estimate the number of tokens in a text string
 * @param {string} text - Text to estimate
 * @returns {number} Estimated token count
 */
function estimateTokens(text) {
  // OpenAI's rule of thumb: ~4 characters per token for English
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

/**
 * Calculate appropriate max_tokens based on input size
 * @param {string} text - Input text
 * @param {string} instruction - User instruction
 * @returns {number} Calculated max_tokens value
 */
function calculateMaxTokens(text, instruction) {
  const inputTokens = estimateTokens(text + instruction);
  const totalInputTokens = inputTokens + SYSTEM_PROMPT_TOKENS;
  
  // For gpt-4o-mini, context window is 128K tokens, output limit is 16K
  // We need to ensure: input_tokens + max_tokens <= 128K
  // And max_tokens <= 16K
  
  // Leave room for the model to think and respond
  const availableForOutput = Math.min(
    MODEL_CONTEXT_WINDOW - totalInputTokens - 1000, // Leave 1K buffer
    MODEL_MAX_OUTPUT // Model's max output
  );
  
  // Calculate based on input size but with reasonable limits
  let responseTokens = Math.max(
    MIN_RESPONSE_TOKENS,
    Math.min(inputTokens * 2, availableForOutput)
  );
  
  // For very large inputs, be more conservative
  if (totalInputTokens > 10000) {
    responseTokens = Math.min(responseTokens, 8000);
  } else if (totalInputTokens > 5000) {
    responseTokens = Math.min(responseTokens, 4000);
  }
  
  console.log('[DirectAIEditService] Token calculation:', {
    textLength: text.length,
    estimatedInputTokens: inputTokens,
    systemPromptTokens: SYSTEM_PROMPT_TOKENS,
    totalInputTokens,
    availableForOutput,
    calculatedMaxTokens: responseTokens
  });
  
  return responseTokens;
}

/**
 * Attempt to repair truncated JSON
 * @param {string} jsonStr - Potentially malformed JSON string
 * @returns {Object|null} Parsed object or null if unrecoverable
 */
function attemptJSONRepair(jsonStr) {
  // First try parsing as-is
  try {
    return JSON.parse(jsonStr);
  } catch {
    // Continue with repair attempts
  }
  
  // Common issues with truncated JSON:
  // 1. Missing closing braces/brackets
  // 2. Incomplete string values
  // 3. Truncated in the middle of a value
  
  let repaired = jsonStr.trim();
  
  // Count opening and closing braces/brackets
  const openBraces = (repaired.match(/{/g) || []).length;
  const closeBraces = (repaired.match(/}/g) || []).length;
  const openBrackets = (repaired.match(/\[/g) || []).length;
  const closeBrackets = (repaired.match(/]/g) || []).length;
  
  // Try to fix unclosed strings (look for last quote)
  const lastQuoteIndex = repaired.lastIndexOf('"');
  
  // Check if we might be in an unclosed string
  if (lastQuoteIndex > -1) {
    const afterLastQuote = repaired.substring(lastQuoteIndex + 1);
    if (!afterLastQuote.includes('"')) {
      // Likely truncated in a string value
      repaired += '"';
    }
  }
  
  // Add missing brackets
  repaired += ']'.repeat(openBrackets - closeBrackets);
  repaired += '}'.repeat(openBraces - closeBraces);
  
  // Try parsing the repaired JSON
  try {
    const parsed = JSON.parse(repaired);
    console.warn('[DirectAIEditService] Successfully repaired truncated JSON');
    return parsed;
  } catch {
    // If it still fails, try extracting just the edits array
    const editsMatch = repaired.match(/"edits"\s*:\s*\[([\s\S]*?)\]/);
    if (editsMatch) {
      try {
        const editsArray = JSON.parse(`[${editsMatch[1]}]`);
        console.warn('[DirectAIEditService] Extracted edits array from malformed JSON');
        return { edits: editsArray };
      } catch {
        // Give up
      }
    }
  }
  
  return null;
}

/**
 * Request edit suggestions directly from OpenAI
 * @param {Object} params
 * @param {string} params.text - Selected text to edit
 * @param {string} params.instruction - User's edit instruction
 * @returns {Promise<Object>} Edit suggestions in the expected format
 */
export async function getDirectAISuggestions({ text, instruction }) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  // Check text size limits upfront
  const textTokens = estimateTokens(text);
  if (textTokens > MAX_INPUT_TOKENS) {
    throw new Error(`Text too large (${textTokens} tokens). Maximum allowed is ${MAX_INPUT_TOKENS} tokens. Please select a smaller portion of text.`);
  }

  const systemPrompt = `You are an AI text editor. The user will provide text and an instruction for how to modify it.
  
Your response MUST be valid JSON in this exact format:
{
  "edits": [
    {
      "id": "edit-001",
      "type": "modification",
      "target": "exact text to replace",
      "replacement": "new text",
      "confidence": 0.95,
      "reason": "Brief explanation"
    }
  ]
}

Rules:
- For simple modifications, use type: "modification"
- For deletions, use type: "deletion" with replacement: null
- The "target" must be the EXACT text from the input
- Include confidence score (0-1)
- Keep changes focused and minimal
- Only make changes that directly address the instruction
- If no changes are needed or the instruction doesn't apply, return an empty edits array: {"edits": []}`;

  const userPrompt = `Text to edit:
"${text}"

Instruction: ${instruction}

Provide edit suggestions in the JSON format specified.`;

  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Fast and cost-effective model for quick edits
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3, // Lower temperature for more consistent edits
        max_tokens: calculateMaxTokens(text, instruction),
        response_format: { type: "json_object" }
      }),
      signal: controller.signal // Add abort signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.text();
      
      // Check for specific error types
      if (error.includes('context_length_exceeded') || error.includes('maximum context length')) {
        throw new Error('Text is too long. Please select a smaller portion to edit.');
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    let suggestions;
    try {
      suggestions = attemptJSONRepair(content) || JSON.parse(content);
    } catch (parseError) {
      console.error('[DirectAIEditService] JSON Parse Error:', {
        error: parseError.message,
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + '...',
        contentEnd: '...' + content.substring(content.length - 200)
      });
      
      // Try to extract error position
      const match = parseError.message.match(/position (\d+)/);
      if (match) {
        const position = parseInt(match[1]);
        console.error('[DirectAIEditService] Error around position:', {
          before: content.substring(Math.max(0, position - 50), position),
          at: content.substring(position, position + 50)
        });
      }
      
      throw new Error('Failed to parse AI response. The response may be too long or malformed.');
    }
    
    // Validate the response structure
    if (!suggestions || typeof suggestions !== 'object') {
      throw new Error('Invalid response format from AI - not an object');
    }
    
    if (!suggestions.edits || !Array.isArray(suggestions.edits)) {
      console.error('[DirectAIEditService] Invalid response structure:', suggestions);
      throw new Error('Invalid response format from AI - missing edits array');
    }

    // Ensure all edits have required fields
    suggestions.edits = suggestions.edits.map((edit, index) => ({
      id: edit.id || `edit-${index + 1}`,
      type: edit.type || 'modification',
      target: edit.target || text,
      replacement: edit.replacement,
      confidence: edit.confidence || 0.8,
      reason: edit.reason || 'AI suggested change',
      occurrences: [1] // For simple edits, just change the first (only) occurrence
    }));

    return suggestions;

  } catch (error) {
    console.error('[DirectAIEditService] Error:', error);
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. The text might be too large or the service is slow. Try selecting less text.');
    }
    
    if (error.message.includes('Text too large')) {
      throw error; // Re-throw our own size limit error
    }
    
    if (error.message.includes('Request timed out')) {
      throw new Error('OpenAI request timed out. This often happens with very large text selections. Try selecting less text.');
    }
    
    // If parsing failed, return a simple modification
    if (error.message.includes('JSON')) {
      return {
        edits: [{
          id: 'edit-fallback',
          type: 'modification',
          target: text,
          replacement: text, // No change as fallback
          confidence: 0.5,
          reason: 'Failed to parse AI response - the text might be too large',
          occurrences: [1]
        }]
      };
    }
    
    throw error;
  }
}

/**
 * Get mock suggestions for testing
 */
export function getMockSuggestions({ text, instruction }) {
  // Simple mock logic for common instructions
  let replacement = text;
  let reason = 'Mock suggestion';
  
  if (instruction.toLowerCase().includes('formal')) {
    replacement = text.charAt(0).toUpperCase() + text.slice(1);
    reason = 'Made text more formal by capitalizing';
  } else if (instruction.toLowerCase().includes('shorter')) {
    replacement = text.split(' ').slice(0, Math.ceil(text.split(' ').length / 2)).join(' ') + '...';
    reason = 'Shortened the text';
  } else if (instruction.toLowerCase().includes('clearer')) {
    replacement = `${text} (clarified)`;
    reason = 'Added clarification';
  }
  
  return {
    edits: [{
      id: 'edit-mock-001',
      type: 'modification',
      target: text,
      replacement: replacement,
      confidence: 0.9,
      reason: reason,
      occurrences: [1]
    }]
  };
} 