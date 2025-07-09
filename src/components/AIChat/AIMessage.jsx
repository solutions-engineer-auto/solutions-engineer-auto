import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

const AIMessage = memo(({ message, isStreaming = false, onReplaceDocument }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`ai-message ${isUser ? 'user-message' : 'assistant-message'} ${isStreaming ? 'streaming' : ''}`}>
      <div className="message-header">
        <div className="message-avatar">
          {isUser ? '👤' : '🤖'}
        </div>
        <span className="message-role">
          {isUser ? 'You' : 'AI Assistant'}
        </span>
        {message.isDocument && (
          <span className="document-badge">📄 Document Generated</span>
        )}
        <span className="message-time">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : ''}
        </span>
      </div>
      
      <div className="message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : message.isDocument ? (
          <div className="document-generated-notice">
            <div className="document-icon">📄</div>
            <div className="document-message">
              <p className="document-title">Document Generated</p>
              <p className="document-subtitle">Your document has been created and loaded in the editor.</p>
            </div>
          </div>
        ) : (
          <ReactMarkdown
            components={{
              code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter
                    style={oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      background: 'rgba(0, 0, 0, 0.4)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className="inline-code" {...props}>
                    {children}
                  </code>
                );
              },
              p: ({ children }) => <p className="message-paragraph">{children}</p>,
              ul: ({ children }) => <ul className="message-list">{children}</ul>,
              ol: ({ children }) => <ol className="message-list ordered">{children}</ol>,
              li: ({ children }) => <li className="message-list-item">{children}</li>,
              blockquote: ({ children }) => <blockquote className="message-blockquote">{children}</blockquote>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="message-link">
                  {children}
                </a>
              ),
              h1: ({ children }) => <h3 className="message-heading">{children}</h3>,
              h2: ({ children }) => <h3 className="message-heading">{children}</h3>,
              h3: ({ children }) => <h4 className="message-heading-small">{children}</h4>,
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        {isStreaming && <span className="streaming-cursor">▊</span>}
      </div>
    </div>
  );
});

AIMessage.displayName = 'AIMessage';

export default AIMessage; 