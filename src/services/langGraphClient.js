import { Client } from '@langchain/langgraph-sdk'

// Log environment variables
console.log('[LangGraphClient] Initializing with:');
console.log('[LangGraphClient] API URL:', import.meta.env.VITE_LANGGRAPH_API_URL);
console.log('[LangGraphClient] API Key exists:', !!import.meta.env.VITE_LANGGRAPH_API_KEY);
console.log('[LangGraphClient] API Key length:', import.meta.env.VITE_LANGGRAPH_API_KEY?.length);

// Initialize the LangGraph client
const client = new Client({
  apiUrl: import.meta.env.VITE_LANGGRAPH_API_URL,
  apiKey: import.meta.env.VITE_LANGGRAPH_API_KEY,
})

// Assistant ID from langgraph.json
const ASSISTANT_ID = 'document_generator'

console.log('[LangGraphClient] Client initialized');
console.log('[LangGraphClient] Assistant ID:', ASSISTANT_ID);

class LangGraphClient {
  /**
   * Start a new document generation session
   * @param {Object} accountData - Account/prospect information
   * @param {string} prompt - Initial generation prompt
   * @returns {Promise<{threadId: string, runId: string}>}
   */
  async startGeneration(accountData, prompt) {
    console.log('[LangGraphClient] Starting generation...');
    console.log('[LangGraphClient] API URL:', import.meta.env.VITE_LANGGRAPH_API_URL);
    console.log('[LangGraphClient] API Key exists:', !!import.meta.env.VITE_LANGGRAPH_API_KEY);
    console.log('[LangGraphClient] Assistant ID:', ASSISTANT_ID);
    
    try {
      // Create a new thread
      console.log('[LangGraphClient] Creating thread...');
      console.log('[LangGraphClient] Client config:', {
        apiUrl: client.apiUrl,
        headers: client.headers,
      });
      
      // Log the actual URL being called
      const threadsUrl = `${import.meta.env.VITE_LANGGRAPH_API_URL}/threads`;
      console.log('[LangGraphClient] Attempting to call:', threadsUrl);
      
      const thread = await client.threads.create()
      console.log('[LangGraphClient] Thread created:', thread);
      
      // Start a run with the document generation task
      console.log('[LangGraphClient] Starting run...');
      const run = await client.runs.create(thread.thread_id, ASSISTANT_ID, {
        input: {
          task: prompt,
          account_data: accountData,
          // Mock document_id for now - agent will create real one with Supabase later
          document_id: `doc-${Date.now()}`
        },
        // Use enqueue strategy to handle multiple requests gracefully
        multitaskStrategy: 'enqueue'
      })
      console.log('[LangGraphClient] Run created:', run);
      
      return {
        threadId: thread.thread_id,
        runId: run.run_id
      }
    } catch (error) {
      console.error('[LangGraphClient] Error starting generation:', error)
      console.error('[LangGraphClient] Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        status: error.status,
        statusText: error.statusText,
        data: error.data,
        config: error.config
      });
      
      // Check for common issues
      if (error.message.includes('fetch')) {
        console.error('[LangGraphClient] Fetch error - possible causes:');
        console.error('- Check if .env.local file exists and is loaded');
        console.error('- Verify API URL is correct');
        console.error('- Check for CORS issues');
        console.error('- Verify API key is valid');
      }
      
      throw error
    }
  }

  /**
   * Stream agent activity events (tool calls, status updates)
   * @param {string} threadId - Thread ID
   * @param {string} runId - Run ID
   * @yields {Object} Activity events
   */
  async* streamAgentActivity(threadId, runId) {
    try {
      console.log('[LangGraphClient] Joining stream for run:', runId)
      
      // Join the existing run's stream
      const stream = client.runs.joinStream(threadId, runId, {
        streamMode: ['events', 'updates']
      })
      
      for await (const event of stream) {
        console.log('[LangGraphClient] Stream event:', event.event, event.data)
        
        // Handle different event types based on LangGraph streaming events
        switch (event.event) {
          case 'events':
            // Tool execution events
            if (event.data?.event === 'on_tool_start') {
              yield {
                type: 'tool_start',
                tool: event.data.name,
                message: this._getToolStartMessage(event.data.name, event.data.data?.input)
              }
            } else if (event.data?.event === 'on_tool_end') {
              yield {
                type: 'tool_complete',
                tool: event.data.name,
                message: this._getToolEndMessage(event.data.name, event.data.data?.output)
              }
            }
            break
            
          case 'updates':
            // State updates from the agent
            if (event.data) {
              console.log('[LangGraphClient] State update:', event.data)
              if (event.data.next_action) {
                yield {
                  type: 'action_change',
                  action: event.data.next_action,
                  message: this._getActionMessage(event.data.next_action)
                }
              }
            }
            break
            
          case 'end':
            yield {
              type: 'generation_complete',
              message: 'Document generation complete'
            }
            break
            
          default:
            console.log('[LangGraphClient] Unhandled event type:', event.event)
        }
      }
    } catch (error) {
      console.error('Error streaming activity:', error)
      yield {
        type: 'error',
        message: error.message
      }
    }
  }

  /**
   * Stream document content as it's being generated
   * @param {string} threadId - Thread ID
   * @param {string} runId - Run ID
   * @yields {Object} Document content updates
   */
  async* streamDocumentContent(threadId, runId) {
    try {
      console.log('[LangGraphClient] Joining content stream for run:', runId)
      
      // Join the existing run's stream for values
      const stream = client.runs.joinStream(threadId, runId, {
        streamMode: 'values'
      })
      
      let lastContent = ''
      
      for await (const event of stream) {
        console.log('[LangGraphClient] Content stream event:', event.event)
        
        if (event.event === 'values' && event.data) {
          const state = event.data
          
          // Check for document content updates
          if (state.document_content && state.document_content !== lastContent) {
            lastContent = state.document_content
            yield {
              type: 'content_update',
              content: state.document_content,
              sections: state.document_sections || [],
              outline: state.outline || [],
              currentSection: state.current_section || 0
            }
          }
          
          // Check if generation is complete
          if (state.complete || state.approved) {
            yield {
              type: 'generation_complete',
              content: state.document_content || lastContent
            }
          }
        }
      }
    } catch (error) {
      console.error('Error streaming content:', error)
      yield {
        type: 'error',
        message: error.message
      }
    }
  }

  /**
   * Send user feedback or refinement request
   * @param {string} threadId - Thread ID
   * @param {string} feedback - User feedback/instructions
   * @returns {Promise<{runId: string}>}
   */
  async sendFeedback(threadId, feedback) {
    try {
      // Create a new run to process the feedback
      // The agent will handle the feedback through the input
      const run = await client.runs.create(threadId, ASSISTANT_ID, {
        input: {
          human_feedback: feedback,
          task: feedback // Also pass as task for the agent
        },
        // Use enqueue strategy to handle multiple requests gracefully
        multitaskStrategy: 'enqueue'
      })
      
      console.log('[LangGraphClient] Feedback run created:', run)
      
      return {
        runId: run.run_id
      }
    } catch (error) {
      console.error('Error sending feedback:', error)
      throw error
    }
  }

  /**
   * Get current thread state
   * @param {string} threadId - Thread ID
   * @returns {Promise<Object>} Thread state
   */
  async getThreadState(threadId) {
    try {
      const state = await client.threads.get(threadId)
      return state.values
    } catch (error) {
      console.error('Error getting thread state:', error)
      throw error
    }
  }

  // Helper methods for formatting messages
  _getToolStartMessage(toolName, inputs) {
    switch (toolName) {
      case 'search_embeddings':
        return `Searching for: ${inputs?.query || 'relevant information'}...`
      case 'fetch_client_info':
        return `Fetching client information for ${inputs?.client_name || 'account'}...`
      case 'generate_content':
        return 'Generating content...'
      default:
        return `Running ${toolName}...`
    }
  }

  _getToolEndMessage(toolName, outputs) {
    switch (toolName) {
      case 'search_embeddings':
        const resultCount = outputs?.length || 0
        return `Found ${resultCount} relevant document${resultCount !== 1 ? 's' : ''}`
      case 'fetch_client_info':
        return 'Client information retrieved'
      case 'generate_content':
        return 'Content generated'
      default:
        return `Completed ${toolName}`
    }
  }

  _getActionMessage(action) {
    switch (action) {
      case 'SEARCH':
        return 'Searching for relevant information...'
      case 'OUTLINE':
        return 'Creating document outline...'
      case 'GENERATE':
        return 'Writing document section...'
      case 'REVIEW':
        return 'Preparing document for review...'
      case 'PROCESS_FEEDBACK':
        return 'Processing your feedback...'
      default:
        return `Processing: ${action}`
    }
  }
}

// Export singleton instance
export default new LangGraphClient()