import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../supabaseClient';

export const useAIChat = ({ documentId, accountData, onDocumentUpdate }) => {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentActivity, setCurrentActivity] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState({ isConnected: false });
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Subscribe to realtime updates
  useEffect(() => {
    if (!documentId) return;
    
    console.log('[useAIChat] Setting up realtime subscription for:', documentId);
    
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
          console.log('[useAIChat] Received message:', payload);
          const msg = payload.new;
          
          if (msg.message_type === 'message') {
            // Regular chat message
            setMessages(prev => [...prev, {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.created_at
            }]);
          } else if (msg.message_type === 'event') {
            // Agent event - show in chat and update activity
            const eventData = msg.event_data || {};
            
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
          }
          
          setConnectionStatus({ isConnected: true });
        }
      )
      .subscribe((status) => {
        console.log('[useAIChat] Subscription status:', status);
        setConnectionStatus({ 
          isConnected: status === 'SUBSCRIBED',
          error: status === 'CLOSED' ? 'Connection lost' : null
        });
      });
    
    return () => {
      console.log('[useAIChat] Cleaning up subscription');
      subscription.unsubscribe();
    };
  }, [documentId]);
  
  const sendMessage = useCallback(async (message, mode = 'agent') => {
    if (isStreaming || !message.trim()) return;
    
    setIsStreaming(true);
    
    // Set a client-side timeout
    const timeoutId = setTimeout(() => {
      console.warn('[useAIChat] Request timed out after 5 minutes');
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
      
      // Call start endpoint with user context
      const response = await fetch('/api/langgraph/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: message,
          accountData: accountData,
          userId: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to start generation: ${response.statusText}`);
      }
      
      const { threadId, runId, documentId: docId } = await response.json();
      
      console.log('[useAIChat] Started generation:', { threadId, runId, docId });
      
      // Messages will arrive via realtime subscription
      
    } catch (error) {
      console.error('[useAIChat] Error:', error);
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
  }, [isStreaming, accountData]);
  
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