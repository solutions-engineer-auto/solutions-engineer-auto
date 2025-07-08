import { useState, useCallback, useRef, useEffect } from 'react';
import { LangGraphSSE } from '../../services/langGraphSSE';

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
  const sseClientRef = useRef(null);
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
        // Agent mode - use SSE
        console.log('[useAIChat] Starting agent mode with threadId:', currentThreadRef.current);
        
        const sseClient = new LangGraphSSE(
          // onUpdate - handle content updates
          (update) => {
            console.log('[useAIChat] Update received:', update);
            setStreamingMessage(update.content || '');
          },
          // onActivity - handle status updates
          (activity) => {
            console.log('[useAIChat] Activity received:', activity);
            if (activity) {
              setCurrentActivity({
                type: activity.type || 'status',
                message: activity.message || 'Processing...'
              });
            } else {
              setCurrentActivity(null);
            }
          },
          // onError
          (error) => {
            console.error('[useAIChat] SSE error:', error);
            setCurrentActivity({ 
              type: 'error', 
              message: error.message 
            });
          },
          // Pass existing thread ID if available
          currentThreadRef.current
        );

        sseClientRef.current = sseClient;
        
        // If we have an existing thread, send as feedback instead
        if (currentThreadRef.current) {
          // First we need to get threadId from a previous SSE session
          await sseClient.sendFeedback(content);
        } else {
          // Start new conversation
          await sseClient.start(content, accountData || { name: 'Chat User' });
          
          // Store thread ID if created
          if (sseClient.threadId) {
            currentThreadRef.current = sseClient.threadId;
            if (onThreadCreate) {
              onThreadCreate(sseClient.threadId);
            }
          }
        }
        
        // The SSE client handles all updates, we just need to add the final message
        console.log('[useAIChat] Final streamingMessage:', streamingMessage);
        const finalContent = streamingMessage || 'I\'ve started working on your document. What would you like me to focus on?';
        console.log('[useAIChat] Adding AI message with content:', finalContent);
        
        const aiMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: finalContent,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
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
      sseClientRef.current?.close();
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
    currentThread: currentThreadRef.current
  };
}; 