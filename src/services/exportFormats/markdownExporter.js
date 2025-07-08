// Markdown Export Module
// Uses turndown to convert HTML content to Markdown

import TurndownService from 'turndown';
import { saveAs } from 'file-saver';

// Initialize Turndown service with custom options
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
  linkStyle: 'inlined',
  linkReferenceStyle: 'full'
});

// Add custom rules for better conversion
turndownService.addRule('strikethrough', {
  filter: ['del', 's', 'strike'],
  replacement: function (content) {
    return '~~' + content + '~~';
  }
});

turndownService.addRule('underline', {
  filter: ['u'],
  replacement: function (content) {
    return '<u>' + content + '</u>';
  }
});

turndownService.addRule('highlight', {
  filter: ['mark'],
  replacement: function (content) {
    return '==' + content + '==';
  }
});

// Custom rule for text alignment (preserve as HTML comment)
turndownService.addRule('textAlign', {
  filter: function (node) {
    return node.style && node.style.textAlign;
  },
  replacement: function (content, node) {
    const align = node.style.textAlign;
    return `<!-- align:${align} -->\n${content}\n<!-- /align -->`;
  }
});

/**
 * Export HTML content to Markdown
 * @param {string} html - HTML content to export
 * @param {object} options - Export options
 * @returns {Promise<void>}
 */
export async function exportToMarkdown(html, options) {
  const { filename, metadata } = options;
  
  try {
    // Prepare HTML for conversion
    const preparedHTML = prepareHTMLForMarkdown(html);
    
    // Convert to markdown
    const markdown = convertToMarkdown(preparedHTML);
    
    // Add metadata header if provided
    const markdownWithMetadata = addMetadataHeader(markdown, metadata);
    
    if (options.preview) {
      // Return markdown for preview
      return markdownWithMetadata;
    } else {
      // Create blob and download
      const blob = new Blob([markdownWithMetadata], { type: 'text/markdown;charset=utf-8' });
      saveAs(blob, `${filename}.md`);
    }
    
    if (options.onProgress) {
      options.onProgress({ stage: 'complete', progress: 100 });
    }
  } catch (error) {
    console.error('Markdown export failed:', error);
    throw new Error(`Failed to export Markdown: ${error.message}`);
  }
}

/**
 * Convert HTML to Markdown
 */
export function convertToMarkdown(html) {
  return turndownService.turndown(html);
}

/**
 * Prepare HTML for Markdown conversion
 */
function prepareHTMLForMarkdown(html) {
  // Create a temporary div to manipulate HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Handle code blocks from TipTap
  const codeBlocks = tempDiv.querySelectorAll('pre');
  codeBlocks.forEach(pre => {
    const code = pre.querySelector('code');
    if (code) {
      // Preserve language if specified
      const language = code.className.match(/language-(\w+)/);
      if (language && language[1]) {
        pre.setAttribute('data-language', language[1]);
      }
    }
  });
  
  // Handle images - ensure alt text
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', `Image ${index + 1}`);
    }
  });
  
  // Handle tables - add basic styling info as data attributes
  const tables = tempDiv.querySelectorAll('table');
  tables.forEach(table => {
    table.setAttribute('data-table', 'true');
  });
  
  return tempDiv.innerHTML;
}

/**
 * Add metadata header to markdown
 */
function addMetadataHeader(markdown, metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return markdown;
  }
  
  // Create YAML front matter
  const frontMatter = [
    '---',
    metadata.title && `title: "${metadata.title}"`,
    metadata.author && `author: "${metadata.author}"`,
    metadata.subject && `subject: "${metadata.subject}"`,
    metadata.keywords && `keywords: "${metadata.keywords}"`,
    metadata.createdDate && `created: ${new Date(metadata.createdDate).toISOString()}`,
    metadata.modifiedDate && `modified: ${new Date(metadata.modifiedDate).toISOString()}`,
    '---',
    ''
  ].filter(Boolean).join('\n');
  
  return frontMatter + '\n' + markdown;
}

/**
 * Configure Turndown service with custom options
 */
export function configureTurndown(options = {}) {
  Object.keys(options).forEach(key => {
    if (Object.prototype.hasOwnProperty.call(turndownService.options, key)) {
      turndownService.options[key] = options[key];
    }
  });
}

/**
 * Add custom rule to Turndown
 */
export function addTurndownRule(name, rule) {
  turndownService.addRule(name, rule);
}

/**
 * Get markdown preview with syntax highlighting hints
 */
export function getMarkdownPreview(markdown) {
  // Add some visual hints for better preview
  const preview = markdown
    // Add syntax highlighting hints
    .replace(/```(\w+)?\n/g, (match, lang) => {
      return `\`\`\`${lang || 'plaintext'}\n`;
    })
    // Ensure proper spacing
    .replace(/\n{3,}/g, '\n\n')
    // Add line breaks after headers
    .replace(/^(#{1,6} .+)$/gm, '$1\n');
  
  return preview;
}

/**
 * Convert specific TipTap nodes to Markdown
 */
export const tiptapNodeConverters = {
  // Convert TipTap task list
  taskList: (node) => {
    return node.content.map(item => {
      const checked = item.attrs?.checked ? 'x' : ' ';
      const content = item.content?.[0]?.text || '';
      return `- [${checked}] ${content}`;
    }).join('\n');
  },
  
  // Convert TipTap mention
  mention: (node) => {
    return `@${node.attrs.id || node.attrs.label}`;
  },
  
  // Convert TipTap emoji
  emoji: (node) => {
    return node.attrs.name || node.attrs.emoji || '';
  }
}; 