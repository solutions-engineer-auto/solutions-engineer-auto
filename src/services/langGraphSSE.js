export class LangGraphSSE {
  constructor(onUpdate, onActivity, onError, existingThreadId = null) {
    this.onUpdate = onUpdate;
    this.onActivity = onActivity;
    this.onError = onError;
    this.eventSource = null;
    this.threadId = existingThreadId;
  }

  async start(prompt, accountData) {
    // Close existing connection
    this.close();
    
    try {
      console.log('[SSE] Starting stream with:', { prompt, accountData });
      
      // For SSE with POST, we need to first make a POST request to initiate
      const initResponse = await fetch('/api/langgraph/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, accountData })
      });

      console.log('[SSE] Response status:', initResponse.status);
      
      if (!initResponse.ok) {
        const errorText = await initResponse.text();
        console.error('[SSE] Error response:', errorText);
        throw new Error(`Failed to start stream: ${initResponse.status} ${initResponse.statusText}`);
      }

      // Read the SSE stream
      const reader = initResponse.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Process all complete lines
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              this.close();
              return;
            }
            if (data) {
              try {
                const parsed = JSON.parse(data);
                console.log('[SSE Client] Raw parsed event:', parsed);
                this.handleEvent(parsed);
              } catch (e) {
                console.error('Failed to parse SSE data:', e, 'Raw data:', data);
              }
            }
          } else if (line.startsWith(':')) {
            // Comment line (e.g., :ping), ignore
            continue;
          }
        }
      }
    } catch (error) {
      console.error('SSE start error:', error);
      this.onError?.(error);
      throw error;
    }
  }

  handleEvent(data) {
    console.log('[SSE Client] Received event:', {
      type: data.type,
      hasData: !!data.data,
      dataKeys: data.data ? Object.keys(data.data) : []
    });
    
    // Store threadId for feedback
    if (data.type === 'started' && data.threadId) {
      this.threadId = data.threadId;
      console.log('[SSE Client] Stored threadId:', this.threadId);
    }

    switch (data.type) {
      case 'values':
        console.log('[SSE Client] Values event:', JSON.stringify(data.data, null, 2));
        // Update document content
        if (data.data?.document_content) {
          console.log('[SSE Client] Found document_content, updating...');
          this.onUpdate?.({
            content: data.data.document_content,
            sections: data.data.document_sections || [],
            complete: data.data.complete || false
          });
        } else {
          console.log('[SSE Client] No document_content in values event. Available keys:', Object.keys(data.data || {}));
        }
        break;
        
      case 'events':
      case 'updates':
        console.log('[SSE Client] Activity event:', data.type, data.data);
        // Show activity updates
        this.onActivity?.({
          type: data.data?.event || 'status',
          message: data.data?.message || 'Processing...',
          action: data.data?.next_action
        });
        break;
        
      case 'complete':
        console.log('[SSE Client] Stream complete');
        this.onActivity?.(null);
        break;
        
      case 'error':
        console.error('[SSE Client] Error event:', data.message);
        this.onError?.(new Error(data.message));
        break;
        
      default:
        console.log('[SSE Client] Unknown event type:', data.type);
    }
  }

  async sendFeedback(feedback) {
    if (!this.threadId) {
      throw new Error('No active thread');
    }

    const response = await fetch('/api/langgraph/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        threadId: this.threadId,
        feedback
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send feedback');
    }

    return response.json();
  }

  close() {
    this.eventSource?.close();
    this.eventSource = null;
  }
}