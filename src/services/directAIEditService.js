/**
 * Direct AI Edit Service - Uses OpenAI API directly for quick edit suggestions
 * This bypasses the full document generation system for simple text edits
 */

// Try multiple possible environment variable names
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || 
                       import.meta.env.VITE_OPENAPI_KEY || 
                       import.meta.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

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
        max_tokens: 500,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response
    const suggestions = JSON.parse(content);
    
    // Validate the response structure
    if (!suggestions.edits || !Array.isArray(suggestions.edits)) {
      throw new Error('Invalid response format from AI');
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
    
    // If parsing failed, return a simple modification
    if (error.message.includes('JSON')) {
      return {
        edits: [{
          id: 'edit-fallback',
          type: 'modification',
          target: text,
          replacement: text, // No change as fallback
          confidence: 0.5,
          reason: 'Failed to parse AI response',
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