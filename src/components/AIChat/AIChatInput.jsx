import React, { useState, useRef, useCallback } from 'react';
import { Send, Mic } from 'lucide-react';

const AIChatInput = ({ 
  onSendMessage, 
  isDisabled,
  isListening,
  isSpeechSupported,
  toggleListening 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    if (message.trim() && !isDisabled) {
      onSendMessage(message);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [message, onSendMessage, isDisabled]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, []);

  /**
   * Handles the click event for the microphone button.
   * Toggles the voice recognition listening state.
   */
  const handleToggleListening = () => {
    if (!isDisabled && toggleListening) {
      toggleListening(setMessage);
    }
  };

  return (
    <form className="ai-chat-input" onSubmit={handleSubmit}>
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? "AI is thinking..." : "Ask a question or use the mic..."}
          disabled={isDisabled}
          className="chat-textarea"
          rows={1}
        />
        {isSpeechSupported && (
          <button
            type="button"
            onClick={handleToggleListening}
            disabled={isDisabled}
            className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 ${isListening ? 'text-red-500 animate-pulse' : ''}`}
            aria-label={isListening ? 'Stop recording' : 'Start recording'}
          >
            <Mic size={20} />
          </button>
        )}
        <button
          type="submit"
          disabled={!message.trim() || isDisabled}
          className="send-button"
          aria-label="Send message"
        >
          <Send size={20} />
        </button>
      </div>
      <div className="input-hint">
        <span>Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for new line</span>
      </div>
    </form>
  );
};

export default AIChatInput; 