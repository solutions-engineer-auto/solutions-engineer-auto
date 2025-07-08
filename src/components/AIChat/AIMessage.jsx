import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Helper function to extract clean content from AI responses
function extractCleanContent(content) {
  if (!content || typeof content !== 'string') return '';
  
  // Remove common AI preambles and responses
  let cleanContent = content;
  
  // Remove sentences that start with these patterns
  cleanContent = cleanContent.replace(/^(Sure|Certainly|Of course|I'd be happy to|Here's|Here is|Let me|I'll|I will|I can|Based on|According to|Looking at|To create|To generate|To write|To build)[^.!?]*[.!?]\s*/gi, '');
  
  // Remove "Here's the X:" type phrases
  cleanContent = cleanContent.replace(/^[^:]+:\s*\n+/i, '');
  
  // Remove leading colons
  cleanContent = cleanContent.replace(/^:\s*/, '');
  
  return cleanContent.trim();
}

// Helper function to convert markdown to HTML
function convertMarkdownToHTML(markdown) {
  if (!markdown || typeof markdown !== 'string') return '';
  
  // Very simple markdown to HTML conversion
  let html = markdown;
  
  // Convert headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  
  // Convert bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Convert italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Convert line breaks to paragraphs
  const paragraphs = html.split('\n\n');
  html = paragraphs
    .map(para => {
      para = para.trim();
      if (!para) return '';
      if (para.startsWith('<')) return para; // Already HTML
      return `<p>${para}</p>`;
    })
    .filter(para => para !== '')
    .join('\n');
  
  return html;
}

const AIMessage = memo(({ message, isStreaming = false, onInsertToDocument }) => {
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
        <span className="message-time">
          {message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : ''}
        </span>
        {!isUser && !isStreaming && onInsertToDocument && (
          <button
            className="insert-to-doc-button"
            onClick={() => {
              try {
                // Extract the actual content, removing AI preamble
                const cleanContent = extractCleanContent(message.content);
                // Convert markdown to HTML
                const htmlContent = convertMarkdownToHTML(cleanContent);
                if (onInsertToDocument && typeof onInsertToDocument === 'function') {
                  onInsertToDocument(htmlContent);
                }
              } catch (error) {
                console.error('Error inserting content:', error);
                alert('Failed to insert content. Please try again.');
              }
            }}
            title="Insert this response into the document"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Insert
          </button>
        )}
      </div>
      
      <div className="message-content">
        {isUser ? (
          <p>{message.content}</p>
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