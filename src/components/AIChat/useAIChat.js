import { useState, useCallback, useRef, useEffect } from 'react';
import { isMarkdownDocument } from '../../utils/markdownToHtml';

// Simulated AI activities similar to Cursor
const AI_ACTIVITIES = [
  { type: 'thinking', message: 'Thinking...', duration: 1000 },
  { type: 'reading', message: 'Reading document...', duration: 1500 },
  { type: 'searching', message: 'Searching codebase...', duration: 2000 },
  { type: 'analyzing', message: 'Analyzing context...', duration: 1200 },
  { type: 'generating', message: 'Generating response...', duration: 800 }
];

// Simulated responses for demo
const MOCK_RESPONSES = [
  "I've analyzed your document and found several key points that could be improved. Here's what I suggest:\n\n1. **Structure Enhancement**: Consider reorganizing the sections for better flow\n2. **Code Examples**: Add more practical examples to illustrate concepts\n3. **Performance Tips**: Include optimization strategies\n\n```javascript\n// Example code snippet\nconst optimizedFunction = useCallback(() => {\n  // Your logic here\n}, [dependencies]);\n```",
  "Based on my analysis of the codebase:\n\n- The current implementation follows React best practices\n- Consider adding error boundaries for better error handling\n- The component structure is clean and modular\n\nWould you like me to elaborate on any of these points?",
  "I found the following in your project:\n\n```jsx\n<DocumentEditor\n  content={content}\n  onChange={handleChange}\n  theme=\"volcanic\"\n/>\n```\n\nThis component could benefit from memoization to prevent unnecessary re-renders."
];

export const useAIChat = (mode = 'mock', threadId = null, onThreadCreate = null) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [connectionStatus, setConnectionStatus] = useState({
    isConnected: mode === 'mock',
    lastError: null
  });
  const [lastGeneratedDocument, setLastGeneratedDocument] = useState(null);
  const activityTimeoutRef = useRef(null);
  const currentThreadRef = useRef(threadId);

  // Simulate AI activities before response
  const simulateActivities = async () => {
    const activities = [...AI_ACTIVITIES].sort(() => Math.random() - 0.5).slice(0, 3);
    
    for (const activity of activities) {
      setCurrentActivity(activity);
      await new Promise(resolve => {
        activityTimeoutRef.current = setTimeout(resolve, activity.duration);
      });
    }
    setCurrentActivity(null);
  };

  // Simulate streaming response
  const simulateStreaming = async (response) => {
    const words = response.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += (i > 0 ? ' ' : '') + words[i];
      setStreamingMessage(currentText);
      
      // Simulate variable typing speed
      const delay = Math.random() * 50 + 20;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return currentText;
  };

  const sendMessage = useCallback(async (content, accountData = null) => {
    if (!content.trim() || isStreaming) return;

    // Add user message
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);

    // Start streaming
    setIsStreaming(true);
    setStreamingMessage('');

    try {
      if (mode === 'agent') {
        // Agent mode - use polling approach
        console.log('[useAIChat] Starting agent mode (polling)');
        
        try {
          // Update connection status
          setConnectionStatus({ isConnected: false, lastError: null });
          
          // Step 1: Start the run
          console.log('[useAIChat] Starting run...');
          const startResponse = await fetch('/api/langgraph/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: content,
              accountData: accountData || { name: 'Chat User' }
            })
          });
          
          if (!startResponse.ok) {
            throw new Error(`Failed to start run: ${startResponse.status}`);
          }
          
          const { threadId, runId, status } = await startResponse.json();
          console.log('[useAIChat] Run started:', { threadId, runId, status });
          
          // Store thread ID
          currentThreadRef.current = threadId;
          if (onThreadCreate) {
            onThreadCreate(threadId);
          }
          
          // Connection successful
          setConnectionStatus({ isConnected: true, lastError: null });
          
          // Step 2: Poll for completion
          console.log('[useAIChat] Starting polling...');
          let attempts = 0;
          const maxAttempts = 60; // 60 seconds max
          let documentContent = '';
          let documentId = null;
          
          while (attempts < maxAttempts) {
            const pollResponse = await fetch(`/api/langgraph/poll?threadId=${threadId}&runId=${runId}`);
            
            if (!pollResponse.ok) {
              throw new Error(`Polling failed: ${pollResponse.status}`);
            }
            
            const pollData = await pollResponse.json();
            
            // Update activity status
            setCurrentActivity({
              type: 'status',
              message: `Processing... (${pollData.status})`
            });
            
            if (pollData.complete) {
              if (pollData.document) {
                documentContent = pollData.document;
                documentId = pollData.documentId || `ai-doc-${Date.now()}`;
                // Document received successfully
                
                // Check if this is a full document
                if (isMarkdownDocument(documentContent)) {
                  const docData = {
                    content: documentContent,
                    documentId: documentId,
                    timestamp: new Date()
                  };
                  setLastGeneratedDocument(docData);
                  // Full document detected, saving for auto-replacement
                }
                
                break;
              } else if (pollData.error) {
                throw new Error(pollData.error);
              } else {
                throw new Error('Run completed but no document generated');
              }
            }
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
          }
          
          if (!documentContent && attempts >= maxAttempts) {
            throw new Error('Timeout waiting for document generation');
          }
          
          // Clear activity
          setCurrentActivity(null);
          
          // Add the final message
          const isDoc = isMarkdownDocument(documentContent);
          // Check if this is a full document
          
          const aiMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: documentContent,
            timestamp: new Date(),
            isDocument: isDoc,
            documentId: documentId
          };
          // Add message to chat
          setMessages(prev => [...prev, aiMessage]);
          
        } catch (error) {
          console.error('[useAIChat] Agent error:', error);
          setCurrentActivity({ type: 'error', message: error.message });
          setConnectionStatus({ 
            isConnected: false, 
            lastError: error.message
          });
          
          // Add error message to chat
          const errorMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: `Error: ${error.message}`,
            timestamp: new Date(),
            isError: true
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      } else {
        // Mock mode - keep existing behavior
        await simulateActivities();
        const response = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)];
        const fullResponse = await simulateStreaming(response);
        
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
      
      setStreamingMessage('');
    } catch (error) {
      console.error('Chat error:', error);
      setCurrentActivity({ type: 'error', message: error.message || 'Something went wrong...' });
      
      // Update connection status with error
      setConnectionStatus({ 
        isConnected: false, 
        lastError: error.message || 'Connection failed'
      });
      
      // Add error message to chat
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsStreaming(false);
      setTimeout(() => setCurrentActivity(null), 3000);
    }
  }, [isStreaming, mode, onThreadCreate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingMessage('');
    setCurrentActivity(null);
  }, []);

  return {
    messages,
    isStreaming,
    currentActivity,
    streamingMessage,
    sendMessage,
    clearMessages,
    currentThread: currentThreadRef.current,
    connectionStatus,
    lastGeneratedDocument
  };
}; 