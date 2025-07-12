import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAIChat } from './useAIChat';
import AIMessage from './AIMessage';
import AIActivityIndicator from './AIActivityIndicator';
import AIChatInput from './AIChatInput';
import ConnectionStatus from './ConnectionStatus';

const AIChatPanel = ({ isOpen, onClose, documentContent, accountData, documentId, agentThreadId, onThreadCreate, onDocumentGenerated }) => {
  const messagesEndRef = useRef(null);
  const panelRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const resizeHandleRef = useRef(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  // Call the hook with the proper parameters
  const chatResult = useAIChat({ 
    documentId: documentId, 
    accountData: accountData,
    onDocumentUpdate: onDocumentGenerated 
  });
  
  // Map to expected property names for backward compatibility
  const messages = chatResult.messages;
  const isStreaming = chatResult.isStreaming;
  const currentActivity = chatResult.currentActivity;
  const streamingMessage = null; // Not in current implementation
  const sendMessage = chatResult.sendMessage;
  const clearMessages = chatResult.clearMessages;
  const currentThread = null; // Not in current implementation
  const connectionStatus = chatResult.connectionStatus;
  const lastGeneratedDocument = null; // Not in current implementation
  const generationProgress = chatResult.generationProgress;
  const isListening = chatResult.isListening;
  const isSpeechSupported = chatResult.isSpeechSupported;
  const toggleListening = chatResult.toggleListening;
  
  // Document replacement is now handled by the onDocumentUpdate callback in useAIChat

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, currentActivity]);

  // Handle panel resize
  useEffect(() => {
    const handleRef = resizeHandleRef.current;
    if (!handleRef) return;

    let startX = 0;
    let startWidth = 0;

    const handleMouseDown = (e) => {
      startX = e.clientX;
      startWidth = panelWidth;
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
    };

    const handleMouseMove = (e) => {
      const diff = startX - e.clientX;
      const newWidth = Math.max(300, Math.min(800, startWidth + diff));
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'default';
    };

    handleRef.addEventListener('mousedown', handleMouseDown);

    return () => {
      handleRef.removeEventListener('mousedown', handleMouseDown);
    };
  }, [panelWidth]);

  const handleSendMessage = useCallback((message) => {
    sendMessage(message, 'agent', accountData);
  }, [sendMessage, accountData]);

  // Handle visibility changes
  useEffect(() => {
    if (isOpen && !isVisible) {
      // Opening
      setIsVisible(true);
      setIsClosing(false);
    } else if (!isOpen && isVisible) {
      // Closing
      setIsClosing(true);
      setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
      }, 300); // Match the CSS animation duration
    }
  }, [isOpen, isVisible]);

  // Handle closing animation
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Handle Escape key
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose]);

  if (!isVisible) return null;

  return (
    <div 
      ref={panelRef}
      className={`ai-chat-panel ${isMinimized ? 'minimized' : ''} ${isClosing ? 'closing' : ''}`}
      style={{ width: isMinimized ? 'auto' : `${panelWidth}px` }}
    >
      <div 
        ref={resizeHandleRef}
        className="resize-handle"
        aria-label="Resize panel"
      />
      
      <div className="chat-header glass-panel">
        <div className="header-content">
          <h3>AI Assistant</h3>
          <span className="header-subtitle">Ask anything about your document</span>
        </div>
        <div className="header-actions">
          <button
            onClick={clearMessages}
            className="header-button"
            title="Clear chat"
            disabled={messages.length === 0 || isStreaming}
          >
            🗑️
          </button>
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="header-button"
            title={isMinimized ? "Expand" : "Minimize"}
          >
            {isMinimized ? '◀' : '▶'}
          </button>
          <button
            onClick={handleClose}
            className="header-button close-button"
            title="Close chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Connection Status */}
      {!isMinimized && (
        <div className="connection-status-container glass-panel">
          <ConnectionStatus 
            mode="agent"
            isConnected={connectionStatus.isConnected}
            lastError={connectionStatus.lastError}
            threadId={currentThread}
          />
        </div>
      )}

      {!isMinimized && (
        <>
          <div className="chat-messages">
            {messages.length === 0 && !currentActivity && (
              <div className="empty-state">
                <div className="empty-state-icon">💬</div>
                <h4>Start a conversation</h4>
                <p>Ask me anything about your document, code, or get help with editing.</p>
                <div className="starter-prompts">
                  <button 
                    className="starter-prompt"
                    onClick={() => handleSendMessage("Generate an integration proposal")}
                  >
                    📄 Generate proposal
                  </button>
                  <button 
                    className="starter-prompt"
                    onClick={() => handleSendMessage("Create a technical specification")}
                  >
                    ✨ Create spec
                  </button>
                  <button 
                    className="starter-prompt"
                    onClick={() => handleSendMessage("Write an implementation guide")}
                  >
                    🔄 Implementation guide
                  </button>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <AIMessage 
                key={message.id} 
                message={message}
              />
            ))}
            
            {currentActivity && <AIActivityIndicator activity={currentActivity} />}
            
            {streamingMessage && (
              <AIMessage 
                message={{ 
                  role: 'assistant', 
                  content: streamingMessage,
                  timestamp: new Date()
                }} 
                isStreaming={true}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <AIChatInput 
            onSendMessage={handleSendMessage}
            isDisabled={isStreaming}
            isListening={isListening}
            isSpeechSupported={isSpeechSupported}
            toggleListening={toggleListening}
          />
        </>
      )}
    </div>
  );
};

export default AIChatPanel; 