import { useState, useCallback, useRef, useEffect } from 'react';
import { streamChatCompletion, isOpenAIConfigured } from '../../services/openai';

// Simulated AI activities for fallback mode
const AI_ACTIVITIES = [
  { type: 'thinking', message: 'Thinking...', duration: 1000 },
  { type: 'reading', message: 'Reading document...', duration: 1500 },
  { type: 'searching', message: 'Searching codebase...', duration: 2000 },
  { type: 'analyzing', message: 'Analyzing context...', duration: 1200 },
  { type: 'generating', message: 'Generating response...', duration: 800 }
];

// Simulated responses for when OpenAI is not configured
const MOCK_RESPONSES = [
  "I've analyzed your document and found several key points that could be improved. Here's what I suggest:\n\n1. **Structure Enhancement**: Consider reorganizing the sections for better flow\n2. **Code Examples**: Add more practical examples to illustrate concepts\n3. **Performance Tips**: Include optimization strategies\n\n```javascript\n// Example code snippet\nconst optimizedFunction = useCallback(() => {\n  // Your logic here\n}, [dependencies]);\n```",
  "Based on my analysis of the codebase:\n\n- The current implementation follows React best practices\n- Consider adding error boundaries for better error handling\n- The component structure is clean and modular\n\nWould you like me to elaborate on any of these points?",
  "I found the following in your project:\n\n```jsx\n<DocumentEditor\n  content={content}\n  onChange={handleChange}\n  theme=\"volcanic\"\n/>\n```\n\nThis component could benefit from memoization to prevent unnecessary re-renders."
];

export const useAIChat = () => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const eventSourceRef = useRef(null);
  const activityTimeoutRef = useRef(null);

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

  const sendMessage = useCallback(async (content) => {
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
      // Check if OpenAI is configured
      if (!isOpenAIConfigured()) {
        // Fall back to simulated mode
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
        setStreamingMessage('');
        return;
      }

      // Use real OpenAI API
      const messagesToSend = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      messagesToSend.push({ role: 'user', content: content.trim() });

      let streamingContent = '';
      
      await streamChatCompletion({
        messages: messagesToSend,
        onChunk: (chunk) => {
          streamingContent += chunk;
          setStreamingMessage(streamingContent);
        },
        onActivity: (activity) => {
          setCurrentActivity(activity);
        },
        onComplete: (fullContent) => {
          // Add AI message
          const aiMessage = {
            id: Date.now() + 1,
            role: 'assistant',
            content: fullContent,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, aiMessage]);
          setStreamingMessage('');
        },
        onError: (error) => {
          console.error('OpenAI chat error:', error);
          setCurrentActivity({ type: 'error', message: error.message || 'Something went wrong...' });
        }
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      setCurrentActivity({ type: 'error', message: 'Something went wrong...' });
      
      // Show error message
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `I encountered an error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingMessage('');
    } finally {
      setIsStreaming(false);
    }
  }, [isStreaming, messages]);

  // Connect to real SSE endpoint (for future use)
  const connectToStream = useCallback((endpoint) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    eventSourceRef.current = new EventSource(endpoint);
    
    eventSourceRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'activity') {
        setCurrentActivity(data.activity);
      } else if (data.type === 'token') {
        setStreamingMessage(prev => prev + data.token);
      } else if (data.type === 'done') {
        setIsStreaming(false);
        setCurrentActivity(null);
      }
    };

    eventSourceRef.current.onerror = () => {
      setIsStreaming(false);
      setCurrentActivity({ type: 'error', message: 'Connection lost' });
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
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
    connectToStream
  };
}; 