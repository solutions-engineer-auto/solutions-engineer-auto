// HTML Export Module
// Exports HTML content with embedded styles

import { saveAs } from 'file-saver';

/**
 * Export HTML content with embedded styles
 * @param {string} html - HTML content to export
 * @param {object} options - Export options
 * @returns {Promise<void>}
 */
export async function exportToHTML(html, options) {
  const { filename } = options;
  
  try {
    // Create complete HTML document
    const completeHTML = createCompleteHTMLDocument(html, options);
    
    if (options.preview) {
      // Return HTML for preview
      return completeHTML;
    } else {
      // Create blob and download
      const blob = new Blob([completeHTML], { type: 'text/html;charset=utf-8' });
      saveAs(blob, `${filename}.html`);
    }
    
    if (options.onProgress) {
      options.onProgress({ stage: 'complete', progress: 100 });
    }
  } catch (error) {
    console.error('HTML export failed:', error);
    throw new Error(`Failed to export HTML: ${error.message}`);
  }
}

/**
 * Create complete HTML document with all necessary styles and metadata
 */
function createCompleteHTMLDocument(html, options) {
  const { metadata, styling } = options;
  
  // Clean and prepare HTML
  const cleanedHTML = prepareHTMLForExport(html);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${metadata.title || 'Document'}</title>
    <meta name="author" content="${metadata.author || ''}">
    <meta name="description" content="${metadata.subject || ''}">
    <meta name="keywords" content="${metadata.keywords || ''}">
    <meta name="generator" content="TipTap Editor">
    <meta name="created" content="${metadata.createdDate ? new Date(metadata.createdDate).toISOString() : ''}">
    <meta name="modified" content="${metadata.modifiedDate ? new Date(metadata.modifiedDate).toISOString() : ''}">
    
    <style>
        /* CSS Reset */
        *, *::before, *::after {
            box-sizing: border-box;
        }
        
        /* Document Styles */
        html {
            font-size: 16px;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        
        body {
            margin: 0;
            padding: 40px;
            font-family: ${styling.fontFamily || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'};
            font-size: ${styling.fontSize || '16px'};
            line-height: ${styling.lineHeight || 1.6};
            color: #333333;
            background-color: #ffffff;
            max-width: 800px;
            margin: 0 auto;
        }
        
        /* Typography */
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
            line-height: 1.25;
            color: #1a1a1a;
        }
        
        h1 {
            font-size: 2.5em;
            border-bottom: 2px solid #e0e0e0;
            padding-bottom: 0.3em;
        }
        
        h2 { font-size: 2em; }
        h3 { font-size: 1.5em; }
        h4 { font-size: 1.25em; }
        h5 { font-size: 1.1em; }
        h6 { font-size: 1em; }
        
        /* Paragraphs */
        p {
            margin-top: 0;
            margin-bottom: 1em;
        }
        
        /* Links */
        a {
            color: #0066cc;
            text-decoration: none;
            border-bottom: 1px solid transparent;
            transition: border-bottom-color 0.2s;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        a:visited {
            color: #551a8b;
        }
        
        /* Lists */
        ul, ol {
            margin-top: 0;
            margin-bottom: 1em;
            padding-left: 2em;
        }
        
        li {
            margin-bottom: 0.25em;
        }
        
        /* Nested lists */
        ul ul, ul ol, ol ul, ol ol {
            margin-top: 0.25em;
            margin-bottom: 0.25em;
        }
        
        /* Blockquotes */
        blockquote {
            margin: 1em 0;
            padding: 0.5em 1em;
            border-left: 4px solid #0066cc;
            background-color: #f8f9fa;
            font-style: italic;
            color: #555555;
        }
        
        blockquote p:last-child {
            margin-bottom: 0;
        }
        
        /* Code */
        code {
            font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.875em;
            padding: 0.2em 0.4em;
            background-color: #f3f4f6;
            border-radius: 3px;
            color: #d63384;
        }
        
        pre {
            font-family: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;
            font-size: 0.875em;
            line-height: 1.5;
            margin: 1em 0;
            padding: 1em;
            background-color: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            overflow-x: auto;
            white-space: pre;
        }
        
        pre code {
            padding: 0;
            background-color: transparent;
            border-radius: 0;
            color: inherit;
        }
        
        /* Tables */
        table {
            width: 100%;
            margin: 1em 0;
            border-collapse: collapse;
            border-spacing: 0;
            overflow-x: auto;
            display: block;
        }
        
        th, td {
            padding: 0.75em;
            text-align: left;
            border: 1px solid #dee2e6;
        }
        
        th {
            background-color: #f8f9fa;
            font-weight: 600;
            color: #495057;
        }
        
        tr:nth-child(even) {
            background-color: #f8f9fa;
        }
        
        /* Images */
        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em auto;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        /* Text Alignment */
        .text-left,
        [style*="text-align: left"] {
            text-align: left !important;
        }
        
        .text-center,
        [style*="text-align: center"] {
            text-align: center !important;
        }
        
        .text-right,
        [style*="text-align: right"] {
            text-align: right !important;
        }
        
        .text-justify,
        [style*="text-align: justify"] {
            text-align: justify !important;
        }
        
        /* Highlights */
        mark {
            background-color: #fff59d;
            padding: 0.1em 0.2em;
            border-radius: 2px;
        }
        
        /* Horizontal Rule */
        hr {
            margin: 2em 0;
            border: 0;
            border-top: 2px solid #e9ecef;
        }
        
        /* Print Styles */
        @media print {
            body {
                padding: 0;
                max-width: none;
            }
            
            h1, h2, h3, h4, h5, h6 {
                page-break-after: avoid;
            }
            
            p, blockquote, pre, table, img {
                page-break-inside: avoid;
            }
            
            img {
                box-shadow: none;
            }
            
            a {
                color: #000;
                text-decoration: underline;
            }
            
            a[href^="http"]:after {
                content: " (" attr(href) ")";
                font-size: 0.875em;
                color: #666;
            }
        }
        
        /* Dark Mode Support */
        @media (prefers-color-scheme: dark) {
            body {
                color: #e0e0e0;
                background-color: #1a1a1a;
            }
            
            h1, h2, h3, h4, h5, h6 {
                color: #f0f0f0;
            }
            
            h1 {
                border-bottom-color: #404040;
            }
            
            a {
                color: #66b3ff;
            }
            
            a:visited {
                color: #b794f6;
            }
            
            blockquote {
                background-color: #2a2a2a;
                border-left-color: #66b3ff;
                color: #b0b0b0;
            }
            
            code {
                background-color: #2a2a2a;
                color: #ff7b72;
            }
            
            pre {
                background-color: #2a2a2a;
                border-color: #404040;
            }
            
            th {
                background-color: #2a2a2a;
                color: #e0e0e0;
            }
            
            td, th {
                border-color: #404040;
            }
            
            tr:nth-child(even) {
                background-color: #252525;
            }
            
            mark {
                background-color: #5a4b00;
                color: #fff;
            }
            
            hr {
                border-top-color: #404040;
            }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
            body {
                padding: 20px;
                font-size: 14px;
            }
            
            h1 { font-size: 2em; }
            h2 { font-size: 1.5em; }
            h3 { font-size: 1.25em; }
            
            table {
                font-size: 0.875em;
            }
            
            pre {
                padding: 0.5em;
                font-size: 0.75em;
            }
        }
    </style>
</head>
<body>
    ${cleanedHTML}
    
    <footer style="margin-top: 4em; padding-top: 2em; border-top: 1px solid #e0e0e0; font-size: 0.875em; color: #666;">
        <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        ${metadata.author ? `<p>Author: ${metadata.author}</p>` : ''}
    </footer>
</body>
</html>`;
}

/**
 * Prepare HTML for export by cleaning and enhancing
 */
function prepareHTMLForExport(html) {
  // Create a temporary div to manipulate HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Enhance images with loading lazy attribute
  const images = tempDiv.querySelectorAll('img');
  images.forEach(img => {
    img.setAttribute('loading', 'lazy');
    
    // Add title from alt if not present
    if (!img.getAttribute('title') && img.getAttribute('alt')) {
      img.setAttribute('title', img.getAttribute('alt'));
    }
  });
  
  // Add target="_blank" to external links
  const links = tempDiv.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
  
  // Add language class to code blocks
  const codeBlocks = tempDiv.querySelectorAll('pre code');
  codeBlocks.forEach(code => {
    const className = code.className;
    if (className && className.includes('language-')) {
      const language = className.match(/language-(\w+)/);
      if (language && language[1]) {
        code.parentElement.setAttribute('data-language', language[1]);
      }
    }
  });
  
  return tempDiv.innerHTML;
}

/**
 * Minify HTML for smaller file size
 */
export function minifyHTML(html) {
  return html
    // Remove comments (except IE conditionals)
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    // Remove unnecessary whitespace
    .replace(/\s+/g, ' ')
    // Remove whitespace between tags
    .replace(/>\s+</g, '><')
    // Trim whitespace
    .trim();
}

/**
 * Create HTML template for specific document types
 */
export function getHTMLTemplate(documentType) {
  const templates = {
    'report': {
      headerHTML: '<header><h1>Report</h1></header>',
      footerHTML: '<footer>© Company Name</footer>'
    },
    'article': {
      headerHTML: '',
      footerHTML: '<footer><p>End of article</p></footer>'
    },
    'letter': {
      headerHTML: '<header style="text-align: right;">Date: {{date}}</header>',
      footerHTML: '<footer><p>Sincerely,<br>{{author}}</p></footer>'
    }
  };
  
  return templates[documentType] || { headerHTML: '', footerHTML: '' };
} 