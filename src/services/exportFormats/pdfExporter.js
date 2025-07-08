// PDF Export Module
// Uses html2pdf.js to convert HTML content to PDF

import html2pdf from 'html2pdf.js';

/**
 * Export HTML content to PDF
 * @param {string} html - HTML content to export
 * @param {object} options - Export options
 * @returns {Promise<void>}
 */
export async function exportToPDF(html, options) {
  const { filename, styling } = options;
  
  // Create styled HTML document
  const styledHTML = createStyledDocument(html, options);
  
  // PDF generation options
  const pdfOptions = {
    margin: [
      parseFloat(styling.marginTop) || 1,
      parseFloat(styling.marginRight) || 1,
      parseFloat(styling.marginBottom) || 1,
      parseFloat(styling.marginLeft) || 1
    ],
    filename: `${filename}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 2,
      useCORS: true,
      letterRendering: true,
      logging: false
    },
    jsPDF: { 
      unit: 'in', 
      format: styling.pageSize.toLowerCase(), 
      orientation: styling.orientation
    },
    pagebreak: { 
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after'
    }
  };

  try {
    // Show progress if callback provided
    if (options.onProgress) {
      options.onProgress({ stage: 'generating', progress: 0 });
    }

    // Generate PDF
    const pdfWorker = html2pdf()
      .set(pdfOptions)
      .from(styledHTML)
      .toPdf();

    if (options.preview) {
      // Return PDF as blob for preview
      const blob = await pdfWorker.output('blob');
      return blob;
    } else {
      // Download the PDF
      await pdfWorker.save();
    }

    if (options.onProgress) {
      options.onProgress({ stage: 'complete', progress: 100 });
    }
  } catch (error) {
    console.error('PDF export failed:', error);
    throw new Error(`Failed to export PDF: ${error.message}`);
  }
}

/**
 * Create a styled HTML document for PDF export
 */
function createStyledDocument(html, options) {
  const { metadata, styling } = options;
  
  // Clean and prepare HTML
  const cleanedHTML = prepareHTMLForPDF(html);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${metadata.title}</title>
      <meta name="author" content="${metadata.author}">
      <meta name="subject" content="${metadata.subject}">
      <meta name="keywords" content="${metadata.keywords}">
      <style>
        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: ${styling.fontFamily};
          font-size: ${styling.fontSize};
          line-height: ${styling.lineHeight};
          color: #000 !important;
          background: #fff;
          padding: 20px;
        }
        
        /* Override any theme colors */
        * {
          color: #000 !important;
        }
        
        /* Typography */
        h1, h2, h3, h4, h5, h6 {
          margin-top: 1em;
          margin-bottom: 0.5em;
          font-weight: bold;
          page-break-after: avoid;
          color: #000 !important;
          display: block;
        }
        
        h1 { 
          font-size: 2.5em !important; 
          border-bottom: 2px solid #333;
          padding-bottom: 0.3em;
        }
        h2 { font-size: 2em !important; }
        h3 { font-size: 1.5em !important; }
        h4 { font-size: 1.25em !important; }
        h5 { font-size: 1.1em !important; }
        h6 { font-size: 1em !important; }
        
        p {
          margin: 0.5em 0 1em 0;
          text-align: justify;
          orphans: 3;
          widows: 3;
        }
        
        /* Lists */
        ul, ol {
          margin: 1em 0;
          padding-left: 40px;
          list-style-position: outside;
        }
        
        ul {
          list-style-type: disc;
        }
        
        ol {
          list-style-type: decimal;
        }
        
        /* Handle TipTap's list classes */
        .list-disc, .list-decimal {
          list-style-position: outside !important;
          padding-left: 1.5em !important;
          margin-left: 0 !important;
        }
        
        /* Override Tailwind's ml-6 in PDFs */
        .ml-6 {
          margin-left: 0 !important;
        }
        
        /* Fix list item positioning */
        li {
          margin: 0.25em 0;
          padding-left: 0.5em;
          text-indent: 0;
        }
        
        /* Ensure list markers show properly */
        ul li::marker, ol li::marker {
          unicode-bidi: isolate;
          font-variant-numeric: tabular-nums;
          text-transform: none;
          text-indent: 0 !important;
          text-align: start !important;
          text-align-last: start !important;
        }
        
        /* Blockquotes */
        blockquote {
          margin: 1em 0;
          padding: 0.5em 1em;
          border-left: 4px solid #333;
          background: #f9f9f9;
          font-style: italic;
          page-break-inside: avoid;
        }
        
        /* Code blocks */
        pre {
          background: #f4f4f4;
          border: 1px solid #ddd;
          padding: 1em;
          overflow-x: auto;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          page-break-inside: avoid;
        }
        
        code {
          background: #f4f4f4;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
        }
        
        pre code {
          background: none;
          padding: 0;
        }
        
        /* Links */
        a {
          color: #0066cc !important;
          text-decoration: underline;
        }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          page-break-inside: avoid;
        }
        
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        
        th {
          background: #f4f4f4;
          font-weight: bold;
        }
        
        /* Images */
        img {
          max-width: 100%;
          height: auto;
          display: block;
          margin: 1em auto;
        }
        
        /* Page breaks */
        .page-break-before {
          page-break-before: always;
        }
        
        .page-break-after {
          page-break-after: always;
        }
        
        /* Text alignment classes */
        .text-left { text-align: left; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .text-justify { text-align: justify; }
        
        /* Print specific styles */
        @media print {
          body {
            padding: 0;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }
          
          p, blockquote, pre, table {
            page-break-inside: avoid;
          }
        }
        
        /* Custom TipTap styles */
        [style*="text-align: left"] { text-align: left; }
        [style*="text-align: center"] { text-align: center; }
        [style*="text-align: right"] { text-align: right; }
        [style*="text-align: justify"] { text-align: justify; }
        
        /* Highlight */
        mark {
          background-color: #ffeb3b;
          padding: 0.1em 0.2em;
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
 * Prepare HTML for PDF export by cleaning and normalizing
 */
function prepareHTMLForPDF(html) {
  // Create a temporary div to manipulate HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Remove any script tags
  const scripts = tempDiv.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove any style tags (we'll use our own)
  const styles = tempDiv.querySelectorAll('style');
  styles.forEach(style => style.remove());
  
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
    // Remove any color classes and ensure proper structure
    heading.style.color = '#000';
  });
  
  // Fix list styling by removing problematic Tailwind classes
  const lists = tempDiv.querySelectorAll('ul, ol');
  lists.forEach(list => {
    // Keep list-disc/list-decimal but remove margin classes
    const classes = list.className.split(' ').filter(cls => 
      !cls.includes('ml-') && 
      !cls.includes('mr-') &&
      !cls.includes('mx-')
    );
    list.className = classes.join(' ').trim();
    
    // Ensure proper list styling
    if (list.tagName === 'UL') {
      list.style.listStyleType = 'disc';
    } else if (list.tagName === 'OL') {
      list.style.listStyleType = 'decimal';
    }
    list.style.listStylePosition = 'outside';
    list.style.paddingLeft = '2em';
    list.style.marginLeft = '0';
  });
  
  // Convert relative URLs to absolute
  const links = tempDiv.querySelectorAll('a[href]');
  links.forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.startsWith('http') && !href.startsWith('#')) {
      link.setAttribute('href', new URL(href, window.location.href).href);
    }
  });
  
  // Ensure images have alt text
  const images = tempDiv.querySelectorAll('img');
  images.forEach((img, index) => {
    if (!img.getAttribute('alt')) {
      img.setAttribute('alt', `Image ${index + 1}`);
    }
  });
  
  return tempDiv.innerHTML;
}

/**
 * Generate PDF options based on document type
 */
export function getPDFOptionsForDocumentType(documentType) {
  const baseOptions = {
    margin: 1,
    filename: 'document.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  
  const typeOptions = {
    'proposal': {
      ...baseOptions,
      filename: 'proposal.pdf',
      jsPDF: { ...baseOptions.jsPDF, format: 'letter' }
    },
    'report': {
      ...baseOptions,
      filename: 'report.pdf',
      margin: 1.5
    },
    'memo': {
      ...baseOptions,
      filename: 'memo.pdf',
      margin: 0.75
    },
    'contract': {
      ...baseOptions,
      filename: 'contract.pdf',
      jsPDF: { ...baseOptions.jsPDF, format: 'legal' }
    }
  };
  
  return typeOptions[documentType] || baseOptions;
} 