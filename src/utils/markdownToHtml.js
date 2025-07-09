/**
 * Converts markdown text to HTML
 * Extracted from documentProcessor.js for reuse across the application
 */

export function convertMarkdownToHtml(text) {
  if (!text) return '';
  
  // Enhanced markdown to HTML conversion
  let html = text;
  
  // Escape HTML entities first to prevent XSS
  const escapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  // Function to escape HTML in non-code content
  const escapeHtml = (str) => {
    return str.replace(/[&<>"']/g, (m) => escapeMap[m]);
  };
  
  // Preserve code blocks and inline code temporarily
  const codeBlocks = [];
  const inlineCodes = [];
  
  // Extract code blocks first
  html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
    codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });
  
  // Extract inline code
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `__INLINE_CODE_${inlineCodes.length - 1}__`;
  });
  
  // Now escape HTML in the remaining content
  html = escapeHtml(html);
  
  // Headers (h1-h6)
  html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>');
  html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Horizontal rules
  html = html.replace(/^(-{3,}|_{3,}|\*{3,})$/gim, '<hr>');
  
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gim, '<blockquote><p>$1</p></blockquote>');
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');
  
  // Bold (must come before italic to handle **_text_**)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
  
  // Links with title
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\s+"([^"]+)"\)/g, '<a href="$2" title="$3">$1</a>');
  // Links without title
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Images with alt text
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">');
  
  // Task lists
  html = html.replace(/^- \[x\] (.+)$/gim, '<li style="list-style: none;"><input type="checkbox" checked disabled> $1</li>');
  html = html.replace(/^- \[ \] (.+)$/gim, '<li style="list-style: none;"><input type="checkbox" disabled> $1</li>');
  
  // Unordered lists (handle nested lists)
  html = html.replace(/^(\s*)\* (.+)$/gim, (match, spaces, content) => {
    const level = spaces.length / 2;
    return `${'  '.repeat(level)}<li data-level="${level}">${content}</li>`;
  });
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');
  
  // Ordered lists
  html = html.replace(/^(\d+)\. (.+)$/gim, '<li data-ordered="true">$2</li>');
  
  // Process lists into proper nested structure
  const lines = html.split('\n');
  const processedLines = [];
  let inList = false;
  let listType = null;
  let currentLevel = 0;
  
  for (const line of lines) {
    if (line.includes('<li')) {
      const isOrdered = line.includes('data-ordered="true"');
      const level = parseInt(line.match(/data-level="(\d+)"/)?.['1'] || '0');
      
      if (!inList) {
        listType = isOrdered ? 'ol' : 'ul';
        processedLines.push(`<${listType}>`);
        inList = true;
        currentLevel = level;
      } else if (level > currentLevel) {
        // Start nested list
        listType = isOrdered ? 'ol' : 'ul';
        processedLines.push(`<${listType}>`);
        currentLevel = level;
      } else if (level < currentLevel) {
        // Close nested lists
        for (let i = currentLevel; i > level; i--) {
          processedLines.push(`</${listType}>`);
        }
        currentLevel = level;
      }
      
      // Clean up the li tag
      const cleanedLine = line
        .replace(/ data-level="\d+"/g, '')
        .replace(/ data-ordered="true"/g, '');
      processedLines.push(cleanedLine);
    } else if (inList && line.trim() === '') {
      // Empty line might end the list
      continue;
    } else {
      // Not a list item
      if (inList) {
        // Close all open lists
        for (let i = currentLevel; i >= 0; i--) {
          processedLines.push(`</${listType}>`);
        }
        inList = false;
        currentLevel = 0;
      }
      processedLines.push(line);
    }
  }
  
  // Close any remaining open lists
  if (inList) {
    for (let i = currentLevel; i >= 0; i--) {
      processedLines.push(`</${listType}>`);
    }
  }
  
  html = processedLines.join('\n');
  
  // Tables (simple implementation)
  html = html.replace(/\|(.+)\|/g, (match, content) => {
    if (content.includes('---')) {
      return ''; // Skip separator rows
    }
    const cells = content.split('|').map(cell => cell.trim());
    const cellTags = cells.map(cell => `<td>${cell}</td>`).join('');
    return `<tr>${cellTags}</tr>`;
  });
  // Wrap table rows in table tags
  html = html.replace(/(<tr>[\s\S]+?<\/tr>)/g, '<table style="border-collapse: collapse; width: 100%;">$1</table>');
  
  // Restore code blocks and inline code
  codeBlocks.forEach((code, index) => {
    html = html.replace(`__CODE_BLOCK_${index}__`, code);
  });
  inlineCodes.forEach((code, index) => {
    html = html.replace(`__INLINE_CODE_${index}__`, code);
  });
  
  // Line breaks (two spaces at end of line)
  html = html.replace(/ {2}$/gm, '<br>');
  
  // Paragraphs - wrap remaining text
  html = html.split(/\n\n+/).map(block => {
    block = block.trim();
    if (block && !block.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|table|tr|hr)/)) {
      return `<p>${block}</p>`;
    }
    return block;
  }).filter(block => block).join('\n');
  
  // Clean up any remaining newlines within paragraphs
  html = html.replace(/<p>([^<]+)<\/p>/g, (match, content) => {
    return `<p>${content.replace(/\n/g, ' ')}</p>`;
  });
  
  return html;
}

/**
 * Check if content appears to be a markdown document
 * (has headers, substantial content, etc.)
 */
export function isMarkdownDocument(content) {
  if (!content || typeof content !== 'string') return false;
  
  // Check for markdown indicators
  const hasHeaders = /^#{1,6}\s+.+$/m.test(content);
  const hasLists = /^[\*\-]\s+.+$/m.test(content) || /^\d+\.\s+.+$/m.test(content);
  const hasCodeBlocks = /```[\s\S]*```/.test(content);
  const hasEmphasis = /\*\*.+\*\*/.test(content) || /__.+__/.test(content);
  
  // Check content length (more than just a short response)
  const wordCount = content.split(/\s+/).length;
  const hasSubstantialContent = wordCount > 50;
  
  // All checks passed, determine if it's a document
  
  // Document likely if it has headers and substantial content
  return (hasHeaders || hasLists || hasCodeBlocks) && hasSubstantialContent;
}