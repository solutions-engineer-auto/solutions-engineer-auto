import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import AIMessage from './AIChat/AIMessage';
import AIActivityIndicator from './AIChat/AIActivityIndicator';
import { convertMarkdownToHtml } from '../utils/markdownToHtml';

// Helper functions for activity formatting
const getActivityType = (eventType) => {
  if (eventType.includes('retrieval')) return 'searching';
  if (eventType.includes('analysis')) return 'analyzing';
  if (eventType.includes('planning')) return 'thinking';
  if (eventType.includes('generation')) return 'generating';
  if (eventType.includes('validation')) return 'analyzing';
  if (eventType.includes('assembly')) return 'generating';
  return 'thinking';
};

const getActivityMessage = (eventType, eventData) => {
  // Check for section generation
  if (eventType === 'node.generation.section.started' && eventData.section_title) {
    return `Generating: ${eventData.section_title}`;
  }
  
  // Default messages for each phase
  const messages = {
    'node.account_fetch.started': 'Fetching account information...',
    'node.retrieval.started': 'Searching for relevant documents...',
    'node.analysis.started': 'Analyzing requirements...',
    'node.planning.started': 'Planning document structure...',
    'node.generation.started': 'Generating document content...',
    'node.validation.started': 'Validating document quality...',
    'node.assembly.started': 'Assembling final document...'
  };
  
  return messages[eventType] || 'Processing...';
};

export function GenerateDocumentModal({ isOpen, onClose, onSubmit, accountName, documentId }) {
  const [prompt, setPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentActivity, setCurrentActivity] = useState(null);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentActivity]);

  // Subscribe to real-time updates when generating
  useEffect(() => {
    if (documentId && isGenerating) {
      // Subscribe to chat messages for this document
      subscriptionRef.current = supabase
        .channel(`doc-generation-${documentId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_messages',
            filter: `document_id=eq.${documentId}`
          },
          async (payload) => {
            const newMessage = payload.new;
            
            if (newMessage.message_type === 'event') {
              // Handle event messages
              const eventData = newMessage.event_data || {};
              const eventType = eventData.type || 'unknown';
              
              // Update activity indicator
              if (eventType.includes('.started')) {
                // Format activity for the indicator
                const activityMessage = getActivityMessage(eventType, eventData);
                setCurrentActivity({
                  type: getActivityType(eventType),
                  message: activityMessage,
                  eventData: eventData
                });
              } else if (eventType.includes('.completed') || eventType.includes('.failed')) {
                setCurrentActivity(null);
              }
              
              // Check if document is ready
              if (eventType === 'workflow.document.ready') {
                
                // Save the document content to Supabase
                if (eventData.content && documentId) {
                  try {
                    // Convert markdown to HTML before saving
                    const htmlContent = convertMarkdownToHtml(eventData.content);
                    
                    const { error } = await supabase
                      .from('documents')
                      .update({ 
                        content: htmlContent,
                        generation_status: 'complete'
                      })
                      .eq('id', documentId);
                      
                    if (error) {
                      console.error('Failed to save document content:', error);
                      alert('Failed to save document content. Please try again.');
                      setIsGenerating(false);
                      return;
                    }
                  } catch (conversionError) {
                    console.error('Failed to convert markdown to HTML:', conversionError);
                    alert('Failed to process document content. Please try again.');
                    setIsGenerating(false);
                    return;
                  }
                }
                
                // Show completion message
                setCurrentActivity({
                  type: 'success',
                  message: 'Document generated successfully! Redirecting...',
                  eventData: {}
                });
                
                // Don't set isGenerating to false - keep showing activity view
                // Navigate to document after content is saved
                if (onSubmit) {
                  // Small delay to ensure user sees completion
                  setTimeout(() => {
                    onSubmit(null, documentId, true); // true indicates completion
                  }, 1500);
                }
              }
            }
            
            // Add to messages
            setMessages(prev => [...prev, newMessage]);
          }
        )
        .subscribe();

      return () => {
        if (subscriptionRef.current) {
          supabase.removeChannel(subscriptionRef.current);
        }
      };
    }
  }, [documentId, isGenerating, onSubmit]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      setPrompt('');
      setMessages([]);
      setCurrentActivity(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim() || isSubmitting || isGenerating) return;
    
    setIsSubmitting(true);
    setIsGenerating(true);
    try {
      // Call parent handler to create document and start generation
      await onSubmit(prompt);
      // Don't clear prompt or close modal - wait for generation to complete
    } catch (error) {
      console.error('Failed to submit:', error);
      setIsGenerating(false);
      alert(`Failed to start generation: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting && !isGenerating) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className={`glass-panel p-8 ${isGenerating ? 'max-w-4xl' : 'max-w-2xl'} w-full mx-4 transition-all duration-300`}>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-primary-light mb-2">
            {isGenerating ? 'Generating Document...' : 'Generate Document'}
          </h2>
          {accountName && (
            <p className="text-gray-400">
              For: <span className="text-primary-lighter">{accountName}</span>
            </p>
          )}
        </div>

        {!isGenerating ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label 
                htmlFor="prompt" 
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                What document would you like to create?
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the document you need (e.g., 'Create a technical architecture document for their cloud migration project')"
                className="w-full min-h-[150px] p-3 bg-background-lighter border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-y"
                disabled={isSubmitting}
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!prompt.trim() || isSubmitting}
                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Starting...' : 'Generate'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Activity Logs */}
            <div className="bg-background-lighter rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <AIMessage 
                    key={message.id || index} 
                    message={message} 
                  />
                ))}
                {currentActivity && (
                  <AIActivityIndicator activity={currentActivity} />
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Status Message */}
            <div className="text-center text-gray-400">
              <p>Your document is being generated. You'll be redirected when it's ready.</p>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}