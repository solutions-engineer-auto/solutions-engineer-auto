// Plain Text Export Module
// Exports plain text content without formatting

import { saveAs } from 'file-saver';

/**
 * Export plain text content
 * @param {string} text - Plain text content to export
 * @param {object} options - Export options
 * @returns {Promise<void>}
 */
export async function exportToText(text, options) {
  const { filename, metadata } = options;
  
  try {
    // Format text with metadata if provided
    const formattedText = formatTextWithMetadata(text, metadata);
    
    if (options.preview) {
      // Return text for preview
      return formattedText;
    } else {
      // Create blob and download
      const blob = new Blob([formattedText], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${filename}.txt`);
    }
    
    if (options.onProgress) {
      options.onProgress({ stage: 'complete', progress: 100 });
    }
  } catch (error) {
    console.error('Text export failed:', error);
    throw new Error(`Failed to export text: ${error.message}`);
  }
}

/**
 * Format text with metadata header
 */
function formatTextWithMetadata(text, metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return normalizeText(text);
  }
  
  // Create metadata header
  const header = [];
  
  if (metadata.title) {
    header.push(metadata.title.toUpperCase());
    header.push('='.repeat(metadata.title.length));
    header.push('');
  }
  
  if (metadata.author) {
    header.push(`Author: ${metadata.author}`);
  }
  
  if (metadata.createdDate) {
    header.push(`Date: ${new Date(metadata.createdDate).toLocaleDateString()}`);
  }
  
  if (metadata.subject) {
    header.push(`Subject: ${metadata.subject}`);
  }
  
  if (header.length > 0) {
    header.push(''); // Empty line
    header.push('-'.repeat(60)); // Separator
    header.push(''); // Empty line
  }
  
  return header.join('\n') + normalizeText(text);
}

/**
 * Normalize text for better readability
 */
function normalizeText(text) {
  return text
    // Normalize line breaks
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove multiple consecutive empty lines
    .replace(/\n{3,}/g, '\n\n')
    // Ensure proper spacing after sentences
    .replace(/([.!?])([A-Z])/g, '$1 $2')
    // Trim each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Final trim
    .trim();
}

/**
 * Convert HTML to plain text with better formatting
 * This is a fallback if getText() doesn't provide good results
 */
export function htmlToText(html) {
  // Create a temporary div to manipulate HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Convert specific elements for better text representation
  const conversions = [
    // Headers - add line breaks and emphasis
    { selector: 'h1', process: (el) => `\n\n${el.textContent.toUpperCase()}\n${'='.repeat(el.textContent.length)}\n` },
    { selector: 'h2', process: (el) => `\n\n${el.textContent}\n${'-'.repeat(el.textContent.length)}\n` },
    { selector: 'h3', process: (el) => `\n\n### ${el.textContent}\n` },
    { selector: 'h4', process: (el) => `\n\n#### ${el.textContent}\n` },
    { selector: 'h5', process: (el) => `\n\n##### ${el.textContent}\n` },
    { selector: 'h6', process: (el) => `\n\n###### ${el.textContent}\n` },
    
    // Lists
    { selector: 'ul > li', process: (el) => `  • ${el.textContent}\n` },
    { selector: 'ol > li', process: (el, index) => `  ${index + 1}. ${el.textContent}\n` },
    
    // Paragraphs
    { selector: 'p', process: (el) => `${el.textContent}\n\n` },
    
    // Blockquotes
    { selector: 'blockquote', process: (el) => `\n"${el.textContent}"\n\n` },
    
    // Horizontal rules
    { selector: 'hr', process: () => '\n' + '-'.repeat(60) + '\n\n' },
    
    // Line breaks
    { selector: 'br', process: () => '\n' }
  ];
  
  // Apply conversions
  conversions.forEach(({ selector, process }) => {
    const elements = tempDiv.querySelectorAll(selector);
    elements.forEach((el, index) => {
      const replacement = document.createTextNode(process(el, index));
      el.parentNode.replaceChild(replacement, el);
    });
  });
  
  // Get text content and clean up
  return normalizeText(tempDiv.textContent || tempDiv.innerText || '');
}

/**
 * Format text for specific use cases
 */
export function formatTextForUseCase(text, useCase) {
  switch (useCase) {
    case 'email':
      // Format for email - wrap at 72 characters
      return wrapText(text, 72);
    
    case 'code':
      // Format for code - preserve all whitespace
      return text;
    
    case 'social':
      // Format for social media - truncate if needed
      return text.length > 280 ? text.substring(0, 277) + '...' : text;
    
    case 'sms':
      // Format for SMS - truncate at 160 chars
      return text.length > 160 ? text.substring(0, 157) + '...' : text;
    
    default:
      return text;
  }
}

/**
 * Wrap text at specified column width
 */
function wrapText(text, width = 80) {
  const lines = text.split('\n');
  const wrappedLines = [];
  
  lines.forEach(line => {
    if (line.length <= width) {
      wrappedLines.push(line);
    } else {
      // Split long lines
      const words = line.split(' ');
      let currentLine = '';
      
      words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length <= width) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) {
            wrappedLines.push(currentLine);
          }
          currentLine = word;
        }
      });
      
      if (currentLine) {
        wrappedLines.push(currentLine);
      }
    }
  });
  
  return wrappedLines.join('\n');
}

/**
 * Get text statistics
 */
export function getTextStatistics(text) {
  const words = text.split(/\s+/).filter(word => word.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  
  return {
    characters: text.length,
    charactersNoSpaces: text.replace(/\s/g, '').length,
    words: words.length,
    sentences: sentences.length,
    paragraphs: paragraphs.length,
    averageWordLength: words.length > 0 ? words.reduce((sum, word) => sum + word.length, 0) / words.length : 0,
    readingTime: Math.ceil(words.length / 200) // Assuming 200 words per minute
  };
} 