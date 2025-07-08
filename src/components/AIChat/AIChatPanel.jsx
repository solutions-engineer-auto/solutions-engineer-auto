import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useAIChat } from './useAIChat';
import AIMessage from './AIMessage';
import AIActivityIndicator from './AIActivityIndicator';
import AIChatInput from './AIChatInput';

const AIChatPanel = ({ isOpen, onClose, documentContent, accountData, mode, onModeChange, agentThreadId, onThreadCreate }) => {
  const messagesEndRef = useRef(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);
  const resizeHandleRef = useRef(null);
  
  const {
    messages,
    isStreaming,
    currentActivity,
    streamingMessage,
    sendMessage,
    clearMessages,
    currentThread
  } = useAIChat(mode, agentThreadId, onThreadCreate);

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
    // Add context about the document if it's the first message
    if (messages.length === 0 && documentContent && mode === 'mock') {
      sendMessage(`I'm working on a document. Here's the current content for context:\n\n${documentContent}\n\nMy question: ${message}`, accountData);
    } else {
      sendMessage(message, accountData);
    }
  }, [messages.length, documentContent, sendMessage, mode, accountData]);

  if (!isOpen) return null;

  return (
    <div 
      className={`ai-chat-panel ${isMinimized ? 'minimized' : ''}`}
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
            onClick={onClose}
            className="header-button close-button"
            title="Close chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Mode Toggle */}
      {!isMinimized && (
        <div className="mode-toggle-container glass-panel">
          <div className="mode-toggle">
            <span className="mode-label">Mode:</span>
            <button
              onClick={() => onModeChange('mock')}
              className={`mode-button ${mode === 'mock' ? 'active' : ''}`}
            >
              Mock
            </button>
            <button
              onClick={() => onModeChange('agent')}
              className={`mode-button ${mode === 'agent' ? 'active' : ''}`}
            >
              Agent
            </button>
          </div>
          {mode === 'agent' && (
            <div className="agent-status">
              {currentThread ? (
                <span className="status-text">Thread: {currentThread.slice(-8)}</span>
              ) : (
                <span className="status-text">No active thread</span>
              )}
            </div>
          )}
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
                    onClick={() => handleSendMessage(mode === 'agent' ? "Generate an integration proposal" : "What's the main topic of this document?")}
                  >
                    📄 {mode === 'agent' ? 'Generate proposal' : "What's the main topic?"}
                  </button>
                  <button 
                    className="starter-prompt"
                    onClick={() => handleSendMessage(mode === 'agent' ? "Create a technical specification" : "Can you suggest improvements?")}
                  >
                    ✨ {mode === 'agent' ? 'Create spec' : 'Suggest improvements'}
                  </button>
                  <button 
                    className="starter-prompt"
                    onClick={() => handleSendMessage(mode === 'agent' ? "Write an implementation guide" : "Help me reorganize this content")}
                  >
                    🔄 {mode === 'agent' ? 'Implementation guide' : 'Reorganize content'}
                  </button>
                </div>
              </div>
            )}
            
            {messages.map((message) => (
              <AIMessage key={message.id} message={message} />
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
          />
        </>
      )}
    </div>
  );
};

export default AIChatPanel; 