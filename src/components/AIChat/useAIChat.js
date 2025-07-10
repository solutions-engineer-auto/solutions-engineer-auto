import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export const useAIChat = ({ documentId, accountData, onDocumentUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false });
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Track temporary message IDs to prevent duplicates
  const messageIdMapRef = useRef(new Map());
  
  // Subscribe to realtime updates
  useEffect(() => {
    console.log('[useAIChat] Effect running - documentId:', documentId, 'onDocumentUpdate:', !!onDocumentUpdate);
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
          console.log('[useAIChat] Received message:', {
            message_type: msg.message_type,
            role: msg.role,
            content_preview: msg.content?.substring(0, 100),
            event_type: msg.event_data?.type
          });
          
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
            console.log('[useAIChat] Processing event:', {
              eventType: eventData.type,
              hasContent: !!eventData.content,
              contentLength: eventData.content?.length,
              eventDataKeys: Object.keys(eventData)
            });
            
            // Add to messages (showing agent thinking)
            setMessages(prev => [...prev, {
              id: msg.id,
              role: 'assistant',
              content: msg.content,
              timestamp: msg.created_at,
              isEvent: true,
              eventType: eventData.type,
              eventData: eventData
            }]);
            
            // Update activity indicator
            setCurrentActivity({
              type: eventData.type,
              message: msg.content
            });
            
            // Update progress if available
            if (eventData.progress !== undefined) {
              setGenerationProgress(eventData.progress);
            }
            
            // Clear activity after completion
            if (eventData.type === 'complete') {
              setTimeout(() => {
                setCurrentActivity(null);
                setGenerationProgress(100);
              }, 2000);
            }
            
            // Handle document content updates
            if ((eventData.type === 'generated' || eventData.type === 'document_ready') && eventData.content) {
              console.log('[useAIChat] Document ready event received:', {
                type: eventData.type,
                contentLength: eventData.content?.length,
                hasCallback: !!onDocumentUpdate
              });
              
              // Call the document update callback if provided
              if (onDocumentUpdate) {
                console.log('[useAIChat] Calling onDocumentUpdate with content');
                onDocumentUpdate(eventData.content);
              } else {
                console.warn('[useAIChat] No onDocumentUpdate callback provided');
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
    };
  }, [documentId, onDocumentUpdate]);
  
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
    clearMessages: () => setMessages([])
  };
};