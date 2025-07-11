import { useState, useEffect } from 'react';
import { supabase } from '../../../supabaseClient';

export function useGraphRealtime(accountId) {
  const [accessedNodes, setAccessedNodes] = useState(new Set());

  useEffect(() => {
    if (!accountId || accountId === 'global') return;

    const channel = supabase
      .channel(`graph-realtime-${accountId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `account_id=eq.${accountId}`
      }, (payload) => {
        if (payload.new.message_type === 'event' && 
            payload.new.event_data?.type === 'document_accessed') {
          
          const docId = payload.new.event_data.document_id;
          
          // Add to accessed set
          setAccessedNodes(prev => new Set([...prev, docId]));
          
          // Remove after animation duration
          setTimeout(() => {
            setAccessedNodes(prev => {
              const next = new Set(prev);
              next.delete(docId);
              return next;
            });
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [accountId]);

  return accessedNodes;
} 