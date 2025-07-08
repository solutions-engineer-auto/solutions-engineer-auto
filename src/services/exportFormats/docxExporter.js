// DOCX Export Module
// Uses docx library to convert HTML content to DOCX

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, convertInchesToTwip } from 'docx';
import { saveAs } from 'file-saver';

/**
 * Export HTML content to DOCX
 * @param {string} html - HTML content to export
 * @param {object} options - Export options
 * @returns {Promise<void>}
 */
export async function exportToDOCX(html, options) {
  const { filename, styling } = options;
  
  try {
    // Parse HTML and convert to DOCX elements
    const docElements = parseHTMLToDocxElements(html);
    
    // Create document with proper settings
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(parseFloat(styling.marginTop) || 1),
              right: convertInchesToTwip(parseFloat(styling.marginRight) || 1),
              bottom: convertInchesToTwip(parseFloat(styling.marginBottom) || 1),
              left: convertInchesToTwip(parseFloat(styling.marginLeft) || 1)
            },
            size: {
              orientation: styling.orientation === 'landscape' ? 'landscape' : 'portrait',
              width: styling.pageSize === 'Letter' ? convertInchesToTwip(8.5) : convertInchesToTwip(8.27),
              height: styling.pageSize === 'Letter' ? convertInchesToTwip(11) : convertInchesToTwip(11.69)
            }
          }
        },
        children: docElements
      }]
    });

    // Generate DOCX file
    const blob = await Packer.toBlob(doc);
    
    if (options.preview) {
      // Return blob for preview (though DOCX preview is complex)
      return blob;
    } else {
      // Download the file
      saveAs(blob, `${filename}.docx`);
    }
    
    if (options.onProgress) {
      options.onProgress({ stage: 'complete', progress: 100 });
    }
  } catch (error) {
    console.error('DOCX export failed:', error);
    throw new Error(`Failed to export DOCX: ${error.message}`);
  }
}

/**
 * Parse HTML to DOCX elements
 */
function parseHTMLToDocxElements(html) {
  const elements = [];
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Process all child nodes
  const processNode = (node, parentStyle = {}) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      if (text) {
        return new TextRun({
          text: text,
          ...parentStyle
        });
      }
      return null;
    }
    
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tagName = node.tagName.toLowerCase();
      const children = [];
      
      // Process child nodes
      for (const child of node.childNodes) {
        const result = processNode(child, getStyleForElement(node));
        if (result) {
          if (Array.isArray(result)) {
            children.push(...result);
          } else {
            children.push(result);
          }
        }
      }
      
      switch (tagName) {
        case 'h1':
          return new Paragraph({
            text: node.textContent,
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 }
          });
          
        case 'h2':
          return new Paragraph({
            text: node.textContent,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 240, after: 120 }
          });
          
        case 'h3':
          return new Paragraph({
            text: node.textContent,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 240, after: 120 }
          });
          
        case 'h4':
        case 'h5':
        case 'h6':
          return new Paragraph({
            children: [
              new TextRun({
                text: node.textContent,
                bold: true,
                size: tagName === 'h4' ? 28 : tagName === 'h5' ? 26 : 24
              })
            ],
            spacing: { before: 240, after: 120 }
          });
          
        case 'p':
          return new Paragraph({
            children: children.length > 0 ? children : [new TextRun(node.textContent)],
            spacing: { after: 200 },
            alignment: getAlignment(node)
          });
          
        case 'ul':
        case 'ol':
          return processListItems(node, tagName === 'ol');
          
        case 'blockquote':
          return new Paragraph({
            children: [
              new TextRun({
                text: node.textContent,
                italics: true
              })
            ],
            indent: { left: 720 },
            spacing: { before: 200, after: 200 }
          });
          
        case 'pre':
        case 'code':
          return new Paragraph({
            children: [
              new TextRun({
                text: node.textContent,
                font: 'Courier New',
                size: 20
              })
            ],
            spacing: { before: 200, after: 200 }
          });
          
        case 'br':
          return new Paragraph({ text: '' });
          
        default:
          if (children.length > 0) {
            return children;
          }
          return null;
      }
    }
    
    return null;
  };
  
  // Process all top-level nodes
  for (const node of tempDiv.childNodes) {
    const result = processNode(node);
    if (result) {
      if (Array.isArray(result)) {
        elements.push(...result);
      } else {
        elements.push(result);
      }
    }
  }
  
  // If no elements were created, add a default paragraph
  if (elements.length === 0) {
    elements.push(new Paragraph({ text: 'Empty document' }));
  }
  
  return elements;
}

/**
 * Get style for inline elements
 */
function getStyleForElement(element) {
  const style = {};
  const tagName = element.tagName.toLowerCase();
  
  switch (tagName) {
    case 'strong':
    case 'b':
      style.bold = true;
      break;
    case 'em':
    case 'i':
      style.italics = true;
      break;
    case 'u':
      style.underline = {};
      break;
    case 'del':
    case 's':
      style.strike = true;
      break;
    case 'mark':
      style.highlight = 'yellow';
      break;
    case 'a':
      style.color = '0066cc';
      style.underline = {};
      break;
  }
  
  // Check for text alignment
  const alignStyle = element.style.textAlign;
  if (alignStyle) {
    style.alignment = alignStyle;
  }
  
  return style;
}

/**
 * Get alignment from element
 */
function getAlignment(element) {
  const align = element.style.textAlign;
  switch (align) {
    case 'center':
      return AlignmentType.CENTER;
    case 'right':
      return AlignmentType.RIGHT;
    case 'justify':
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

/**
 * Process list items
 */
function processListItems(listElement, isOrdered) {
  const items = [];
  const listItems = listElement.querySelectorAll('li');
  
  listItems.forEach((li) => {
    items.push(
      new Paragraph({
        children: [
          new TextRun({
            text: li.textContent
          })
        ],
        bullet: isOrdered ? undefined : { level: 0 },
        numbering: isOrdered ? {
          reference: 'default-numbering',
          level: 0
        } : undefined,
        indent: { left: 720 }
      })
    );
  });
  
  return items;
}

/**
 * Create a simple DOCX from plain text
 */
export function createSimpleDOCX(text, filename = 'document') {
  const doc = new Document({
    sections: [{
      properties: {},
      children: text.split('\n').map(line => 
        new Paragraph({
          text: line || ' ',
          spacing: { after: 200 }
        })
      )
    }]
  });
  
  return Packer.toBlob(doc).then(blob => {
    saveAs(blob, `${filename}.docx`);
  });
} 