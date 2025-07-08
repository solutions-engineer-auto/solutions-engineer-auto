// Main Document Export Service
// Coordinates different export formats and provides a unified interface

import { exportToPDF } from './exportFormats/pdfExporter';
import { exportToDOCX } from './exportFormats/docxExporter';
import { exportToMarkdown } from './exportFormats/markdownExporter';
import { exportToHTML } from './exportFormats/htmlExporter';
import { exportToText } from './exportFormats/textExporter';

// Supported export formats
export const EXPORT_FORMATS = {
  PDF: 'pdf',
  DOCX: 'docx',
  MARKDOWN: 'markdown',
  HTML: 'html',
  TEXT: 'text'
};

// Format metadata for UI display
export const FORMAT_INFO = {
  [EXPORT_FORMATS.PDF]: {
    name: 'PDF Document',
    extension: '.pdf',
    mimeType: 'application/pdf',
    icon: '📄',
    description: 'Portable Document Format - Best for sharing and printing'
  },
  [EXPORT_FORMATS.DOCX]: {
    name: 'Word Document',
    extension: '.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    icon: '📝',
    description: 'Microsoft Word format - Best for further editing'
  },
  [EXPORT_FORMATS.MARKDOWN]: {
    name: 'Markdown',
    extension: '.md',
    mimeType: 'text/markdown',
    icon: '📋',
    description: 'Plain text with formatting - Best for developers'
  },
  [EXPORT_FORMATS.HTML]: {
    name: 'HTML File',
    extension: '.html',
    mimeType: 'text/html',
    icon: '🌐',
    description: 'Web page format - Best for web publishing'
  },
  [EXPORT_FORMATS.TEXT]: {
    name: 'Plain Text',
    extension: '.txt',
    mimeType: 'text/plain',
    icon: '📃',
    description: 'Plain text without formatting - Universal compatibility'
  }
};

// Default export options
const DEFAULT_OPTIONS = {
  filename: 'document',
  metadata: {
    title: 'Untitled Document',
    author: 'Unknown',
    subject: '',
    keywords: '',
    createdDate: new Date(),
    modifiedDate: new Date()
  },
  styling: {
    fontFamily: 'Arial, sans-serif',
    fontSize: '12pt',
    lineHeight: 1.5,
    marginTop: '1in',
    marginBottom: '1in',
    marginLeft: '1in',
    marginRight: '1in',
    pageSize: 'A4',
    orientation: 'portrait'
  }
};

/**
 * Main export function that handles all formats
 * @param {string} format - Export format (pdf, docx, markdown, html, text)
 * @param {object} editor - TipTap editor instance
 * @param {object} options - Export options
 * @returns {Promise<void>}
 */
export async function exportDocument(format, editor, options = {}) {
  // Merge options with defaults
  const exportOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    metadata: {
      ...DEFAULT_OPTIONS.metadata,
      ...options.metadata
    },
    styling: {
      ...DEFAULT_OPTIONS.styling,
      ...options.styling
    }
  };

  // Get content from editor
  const htmlContent = editor.getHTML();
  const jsonContent = editor.getJSON();
  const textContent = editor.getText();

  // Add metadata to options
  exportOptions.htmlContent = htmlContent;
  exportOptions.jsonContent = jsonContent;
  exportOptions.textContent = textContent;

  // Export based on format
  switch (format) {
    case EXPORT_FORMATS.PDF:
      return await exportToPDF(htmlContent, exportOptions);
    
    case EXPORT_FORMATS.DOCX:
      return await exportToDOCX(htmlContent, exportOptions);
    
    case EXPORT_FORMATS.MARKDOWN:
      return await exportToMarkdown(htmlContent, exportOptions);
    
    case EXPORT_FORMATS.HTML:
      return await exportToHTML(htmlContent, exportOptions);
    
    case EXPORT_FORMATS.TEXT:
      return await exportToText(textContent, exportOptions);
    
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
}

/**
 * Generate a preview of the document in the specified format
 * @param {string} format - Export format
 * @param {object} editor - TipTap editor instance
 * @param {object} options - Export options
 * @returns {Promise<string|Blob>} Preview data
 */
export async function previewDocument(format, editor, options = {}) {
  const exportOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    preview: true
  };

  const htmlContent = editor.getHTML();

  switch (format) {
    case EXPORT_FORMATS.PDF:
      // Return HTML with print styles for PDF preview
      return generatePrintPreview(htmlContent, exportOptions);
    
    case EXPORT_FORMATS.MARKDOWN: {
      // Return markdown preview
      const { convertToMarkdown } = await import('./exportFormats/markdownExporter');
      return convertToMarkdown(htmlContent);
    }
    
    case EXPORT_FORMATS.HTML:
      // Return styled HTML preview
      return generateHTMLPreview(htmlContent, exportOptions);
    
    case EXPORT_FORMATS.TEXT:
      // Return plain text preview
      return editor.getText();
    
    default:
      return htmlContent;
  }
}

/**
 * Generate print preview HTML with styles
 */
function generatePrintPreview(html, options) {
  const { styling } = options;
  
  // Preprocess HTML to fix dark theme colors
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Fix text color classes from dark theme
  const elementsWithTextColor = tempDiv.querySelectorAll('[class*="text-white"], [class*="text-orange"], [class*="text-yellow"]');
  elementsWithTextColor.forEach(element => {
    // Remove all color-related classes
    const classes = element.className.split(' ').filter(cls => 
      !cls.includes('text-white') && 
      !cls.includes('text-orange') && 
      !cls.includes('text-yellow') &&
      !cls.includes('text-gray') &&
      !cls.includes('text-red') &&
      !cls.includes('text-green') &&
      !cls.includes('text-blue') &&
      !cls.includes('text-purple')
    );
    element.className = classes.join(' ').trim();
  });
  
  // Ensure headings are properly styled
  const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach(heading => {
    heading.style.color = '#000';
  });
  
  const cleanedHTML = tempDiv.innerHTML;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${options.metadata.title}</title>
      <style>
        @page {
          size: ${styling.pageSize} ${styling.orientation};
          margin: ${styling.marginTop} ${styling.marginRight} ${styling.marginBottom} ${styling.marginLeft};
        }
        body {
          font-family: ${styling.fontFamily};
          font-size: ${styling.fontSize};
          line-height: ${styling.lineHeight};
          color: #000 !important;
          background: #fff;
          margin: 0;
          padding: 20px;
        }
        
        /* Override any theme colors */
        * {
          color: #000 !important;
        }
        
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1em;
          margin-bottom: 0.5em;
          font-weight: bold;
          color: #000 !important;
        }
        h1 { font-size: 2em; }
        h2 { font-size: 1.5em; }
        h3 { font-size: 1.17em; }
        p {
          margin: 1em 0;
        }
        ul, ol {
          margin: 1em 0;
          padding-left: 40px;
          list-style-position: outside;
        }
        li {
          margin: 0.25em 0;
        }
        blockquote {
          margin: 1em 40px;
          padding-left: 1em;
          border-left: 4px solid #ddd;
          color: #666 !important;
        }
        pre {
          background: #f4f4f4;
          padding: 1em;
          overflow-x: auto;
          border-radius: 4px;
        }
        code {
          background: #f4f4f4;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
        }
        a {
          color: #0066cc !important;
          text-decoration: underline;
        }
        @media print {
          body {
            padding: 0;
          }
        }
      </style>
    </head>
    <body>
      ${cleanedHTML}
    </body>
    </html>
  `;
}

/**
 * Generate HTML preview with embedded styles
 */
function generateHTMLPreview(html, options) {
  return generatePrintPreview(html, options);
}

/**
 * Validate export options
 */
export function validateExportOptions(options) {
  const errors = [];

  if (options.filename && typeof options.filename !== 'string') {
    errors.push('Filename must be a string');
  }

  if (options.styling?.pageSize && !['A4', 'A3', 'Letter', 'Legal'].includes(options.styling.pageSize)) {
    errors.push('Invalid page size');
  }

  if (options.styling?.orientation && !['portrait', 'landscape'].includes(options.styling.orientation)) {
    errors.push('Invalid orientation');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get file size estimate for export
 */
export function estimateFileSize(format, editor) {
  const htmlLength = editor.getHTML().length;
  const multipliers = {
    [EXPORT_FORMATS.PDF]: 2.5,
    [EXPORT_FORMATS.DOCX]: 1.8,
    [EXPORT_FORMATS.MARKDOWN]: 0.7,
    [EXPORT_FORMATS.HTML]: 1.2,
    [EXPORT_FORMATS.TEXT]: 0.5
  };

  const estimatedBytes = htmlLength * (multipliers[format] || 1);
  return formatFileSize(estimatedBytes);
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
} 