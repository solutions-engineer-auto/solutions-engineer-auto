import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export const useAIChat = ({ documentId, accountData, onDocumentUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false });
  const [generationProgress, setGenerationProgress] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  
  // Track temporary message IDs to prevent duplicates
  const messageIdMapRef = useRef(new Map());
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!documentId) {
      return;
    }
    
    const subscription = supabase
      .channel(`doc-${documentId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages', 
          filter: `document_id=eq.${documentId}` 
        },
        (payload) => {
          const msg = payload.new;
          
          if (msg.message_type === 'message') {
            // Regular chat message
            if (msg.role === 'user') {
              // Check if this is replacing an optimistic message
              setMessages(prev => {
                const existingOptimistic = prev.find(m => 
                  m.isOptimistic && 
                  m.content === msg.content &&
                  m.role === msg.role
                );
                
                if (existingOptimistic) {
                  // Replace the optimistic message with the real one
                  messageIdMapRef.current.set(existingOptimistic.id, msg.id);
                  return prev.map(m => 
                    m.id === existingOptimistic.id 
                      ? { 
                          id: msg.id, 
                          role: msg.role,
                          content: msg.content,
                          timestamp: msg.created_at,
                          isOptimistic: false 
                        }
                      : m
                  );
                }
                
                // Not a duplicate, add normally
                return [...prev, {
                  id: msg.id,
                  role: msg.role,
                  content: msg.content,
                  timestamp: msg.created_at
                }];
              });
            } else {
              // Non-user messages, add normally
              setMessages(prev => [...prev, {
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.created_at
              }]);
            }
          } else if (msg.message_type === 'event') {
            // Agent event - show in chat and update activity
            const eventData = msg.event_data || {};
            
            // Add to messages (filtering to avoid duplication with activity indicators)
            // Use display metadata if available, otherwise fall back to pattern matching
            const shouldAddToMessages = eventData.display 
              ? eventData.display.persist_message !== false
              : (!eventData.type.endsWith('_start') && 
                 !eventData.type.endsWith('.started') &&
                 eventData.type !== 'workflow_start' &&
                 eventData.type !== 'document_ready');
            
            if (shouldAddToMessages) {
              setMessages(prev => [...prev, {
                id: msg.id,
                role: 'assistant',
                content: msg.content,
                timestamp: msg.created_at,
                isEvent: true,
                eventType: eventData.type,
                eventData: eventData
              }]);
            }
            
            // Update activity indicator only for ongoing operations
            // Use display metadata if available, otherwise fall back to pattern matching
            const shouldShowActivity = eventData.display
              ? eventData.display.show_activity === true
              : (eventData.type !== 'document_ready' && 
                 !eventData.type.endsWith('_complete') && 
                 !eventData.type.endsWith('.completed') &&
                 !eventData.type.endsWith('_error') &&
                 !eventData.type.endsWith('.failed') &&
                 eventData.type !== 'workflow_start');
            
            if (shouldShowActivity) {
              setCurrentActivity({
                type: eventData.type,
                message: msg.content,
                eventData: eventData  // Pass full data for icon selection
              });
            }
            
            // Update progress if available
            if (eventData.progress !== undefined) {
              setGenerationProgress(eventData.progress);
            }
            
            // Clear activity immediately when workflow is complete
            // Individual stage completions will be replaced by the next stage's start event
            // Support both old and new event formats
            if (eventData.type === 'workflow_complete' || 
                eventData.type === 'workflow.process.completed') {
              setCurrentActivity(null);
              setGenerationProgress(100);
            }
            
            // Handle document content updates
            // Support both old and new event formats
            if ((eventData.type === 'generated' || 
                 eventData.type === 'document_ready' ||
                 eventData.type === 'document.ready' ||
                 eventData.type === 'workflow.document.ready') && eventData.content) {
              
              // Call the document update callback if provided
              if (onDocumentUpdate) {
                onDocumentUpdate(eventData.content);
              }
            }
          }
          
          setConnectionStatus({ isConnected: true });
        }
      )
      .subscribe((status) => {
        setConnectionStatus({ 
          isConnected: status === 'SUBSCRIBED',
          error: status === 'CLOSED' ? 'Connection lost' : null
        });
      });
    
    return () => {
      subscription.unsubscribe();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [documentId, onDocumentUpdate]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognitionRef.current = recognition;
    } else {
      setIsSpeechSupported(false);
      console.warn("SpeechRecognition API not supported in this browser.");
    }
  }, []);

  /**
   * Toggles the speech recognition listening state.
   * Starts or stops listening for voice input.
   * @param {function(string): void} onTranscriptUpdate - Callback function to update the transcript in the input field.
   */
  const toggleListening = useCallback((onTranscriptUpdate) => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isListening) {
      recognition.stop();
      setIsListening(false);
      return;
    }

    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      onTranscriptUpdate(transcript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Could not start recognition:", e);
      setIsListening(false);
    }
  }, [isListening]);
  
  const sendMessage = useCallback(async (message, mode = 'agent', currentAccountData = null) => {
    if (isStreaming || !message.trim()) return;
    
    // Use passed accountData or fall back to the one from props
    const accountDataToUse = currentAccountData || accountData;
    
    setIsStreaming(true);
    
    // Add user message optimistically with a temporary ID
    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: tempMessageId,
      role: 'user',
      content: message,
      timestamp: new Date(),
      isOptimistic: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Set a client-side timeout
    const timeoutId = setTimeout(() => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: 'The request is taking longer than expected. Please check the document editor for results.',
        timestamp: new Date(),
        isError: true
      }]);
      setIsStreaming(false);
    }, 300000); // 5 minutes
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Debug what we're sending
      const requestBody = {
        prompt: message,
        accountData: accountDataToUse,
        userId: user.id,
        documentId: documentId  // Pass existing document ID if available
      };
      
      // Call start endpoint with user context
      const response = await fetch('/api/langgraph/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start generation: ${response.statusText}`);
      }
      
      const { threadId, runId, documentId: docId } = await response.json();
      
      // Messages will arrive via realtime subscription
      
    } catch (error) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempMessageId));
      
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      clearTimeout(timeoutId);
      setIsStreaming(false);
    }
  }, [isStreaming, accountData, documentId]);
  
  return {
    messages,
    isStreaming,
    currentActivity,
    connectionStatus,
    generationProgress,
    sendMessage,
    clearMessages: () => setMessages([]),
    isListening,
    isSpeechSupported,
    toggleListening,
  };
};