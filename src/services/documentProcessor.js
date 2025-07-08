import mammoth from 'mammoth'
import * as pdfjsLib from 'pdfjs-dist'

// Configure PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  // Use legacy build for better compatibility
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString()
} else {
  console.warn('Web Workers not supported, PDF.js will use fake worker')
}

// Log PDF.js version for debugging
console.log('PDF.js initialized with version:', pdfjsLib.version)
console.log('Worker source:', pdfjsLib.GlobalWorkerOptions.workerSrc)

// We'll load pdf2md dynamically when needed
let pdf2mdModule = null

class DocumentProcessor {
  constructor() {
    this.processors = {
      'application/pdf': this.processPDF.bind(this),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': this.processDOCX.bind(this),
      'application/msword': this.processDOC.bind(this),
      'text/plain': this.processTXT.bind(this),
      'text/markdown': this.processMD.bind(this),
      'text/rtf': this.processRTF.bind(this),
      'application/rtf': this.processRTF.bind(this)
    }
  }

  async processFile(file, onProgress) {
    // Validate file
    if (!file) {
      throw new Error('No file provided')
    }

    if (file.size === 0) {
      throw new Error('File is empty')
    }

    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      throw new Error(`File size exceeds limit of ${maxSize / 1024 / 1024}MB`)
    }

    const processor = this.processors[file.type]
    
    if (!processor) {
      // Try to determine file type from extension if MIME type doesn't match
      const extension = file.name.split('.').pop().toLowerCase()
      const mimeMapping = {
        'pdf': 'application/pdf',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'doc': 'application/msword',
        'txt': 'text/plain',
        'md': 'text/markdown',
        'rtf': 'application/rtf'
      }
      
      const mappedType = mimeMapping[extension]
      if (mappedType && this.processors[mappedType]) {
        // Create a new file with corrected MIME type
        const correctedFile = new File([file], file.name, { type: mappedType })
        return this.processFile(correctedFile, onProgress)
      }
      
      throw new Error(`Unsupported file type: ${file.type || 'unknown'} (${extension})`)
    }

    try {
      const result = await processor(file, onProgress)
      
      // Validate result
      if (!result || !result.html) {
        throw new Error('Document processing returned empty content')
      }
      
      return {
        success: true,
        html: result.html,
        metadata: result.metadata || {},
        originalFile: file
      }
    } catch (error) {
      console.error('Document processing error:', error)
      
      // Provide user-friendly error messages
      let userMessage = error.message
      
      if (error.message.includes('Password')) {
        userMessage = 'This document is password-protected and cannot be processed'
      } else if (error.message.includes('corrupt')) {
        userMessage = 'The file appears to be corrupted and cannot be processed'
      } else if (error.message.includes('Network')) {
        userMessage = 'Network error occurred. Please check your connection and try again'
      }
      
      return {
        success: false,
        error: userMessage,
        originalFile: file
      }
    }
  }

  async processPDF(file, onProgress) {
    onProgress?.(0, 'Loading PDF...')
    
    try {
      console.log('Starting PDF processing for:', file.name, 'Size:', file.size)
      const arrayBuffer = await file.arrayBuffer()
      console.log('ArrayBuffer created, size:', arrayBuffer.byteLength)
      
      // Create a copy of the ArrayBuffer for pdf2md since it might detach it
      const arrayBufferCopy = arrayBuffer.slice(0)
      
      // Try pdf2md first as it's more reliable for text extraction
      try {
          if (!pdf2mdModule) {
            console.log('Loading pdf2md module...')
            pdf2mdModule = await import('@opendocsg/pdf2md')
          }
          
          console.log('Attempting pdf2md extraction...')
          // Wrap in try-catch to handle ArrayBuffer issues
          let markdown = ''
          try {
            markdown = await pdf2mdModule.default(arrayBufferCopy)
          } catch (e) {
            if (e.message && e.message.includes('detached ArrayBuffer')) {
              console.warn('ArrayBuffer issue with pdf2md, skipping...')
              throw e
            }
            throw e
          }
          
          if (markdown && markdown.trim()) {
            console.log('pdf2md extraction successful, converting to HTML')
            // Convert markdown to HTML
            let html = markdown
              // Headers
              .replace(/^### (.*$)/gim, '<h3>$1</h3>')
              .replace(/^## (.*$)/gim, '<h2>$1</h2>')
              .replace(/^# (.*$)/gim, '<h1>$1</h1>')
              // Bold
              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
              // Lists
              .replace(/^\* (.+)$/gim, '<li>$1</li>')
              .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
              // Paragraphs
              .split(/\n\n+/).map(p => {
                if (p.trim() && !p.startsWith('<')) {
                  return `<p>${p.trim()}</p>`
                }
                return p
              }).join('')
            
            return {
              html: html,
              metadata: {
                title: file.name.replace('.pdf', ''),
                fileType: 'pdf',
                extractionMethod: 'pdf2md'
              }
            }
          }
        } catch (pdf2mdError) {
          console.warn('pdf2md extraction failed:', pdf2mdError)
          console.log('Falling back to PDF.js extraction...')
        }
      
      // Configure PDF.js for text extraction
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        // Use default configuration for now
        verbosity: pdfjsLib.VerbosityLevel?.INFOS || 1 // Enable info logging if available
      })
      
      // Handle password-protected PDFs
      loadingTask.onPassword = () => {
        throw new Error('Password-protected PDFs are not supported')
      }
      
      const pdf = await loadingTask.promise
      console.log('PDF loaded successfully, pages:', pdf.numPages)
      
      let htmlContent = ''
      const totalPages = pdf.numPages
      
      if (totalPages === 0) {
        throw new Error('PDF contains no pages')
      }
      
      if (totalPages > 100) {
        throw new Error('PDF is too large (over 100 pages). Please use a smaller document')
      }
    
          for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        onProgress?.(pageNum / totalPages * 100, `Processing page ${pageNum} of ${totalPages}`)
        
        const page = await pdf.getPage(pageNum)
        const textContent = await page.getTextContent()
        
        console.log(`Page ${pageNum} text items:`, textContent.items.length)
        
        // Debug first few text items
        if (textContent.items.length > 0) {
          console.log('Sample text items:', textContent.items.slice(0, 5).map(item => ({
            str: item.str,
            length: item.str.length,
            isEmpty: item.str.trim() === '',
            transform: item.transform,
            width: item.width,
            height: item.height,
            dir: item.dir,
            fontName: item.fontName
          })))
          
          // Check if ALL items are empty
          const allEmpty = textContent.items.every(item => !item.str || item.str.trim() === '')
          if (allEmpty) {
            console.warn('WARNING: All text items are empty strings! This PDF might have encoding issues.')
          }
        }
        
        // Group text items by y-position to maintain line structure
        const textLines = {}
        let itemCount = 0
        
        textContent.items.forEach(item => {
          // Log EVERY item, even empty ones
          if (pageNum === 1 && textContent.items.indexOf(item) < 3) {
            console.log('Raw item:', {
              str: item.str,
              strLength: item.str.length,
              strCharCodes: item.str.split('').map(c => c.charCodeAt(0)),
              hasText: item.hasEOL,
              transform: item.transform
            })
          }
          
          if (item.str && item.str.trim()) {
            itemCount++
            const y = Math.round(item.transform[5])
            if (!textLines[y]) {
              textLines[y] = []
            }
            textLines[y].push(item.str)
          }
        })
        
        console.log(`Page ${pageNum} - Found ${itemCount} non-empty text items grouped into ${Object.keys(textLines).length} lines`)
        
        // Sort by y-position (descending) and create paragraphs
        const sortedYPositions = Object.keys(textLines).sort((a, b) => b - a)
        
        sortedYPositions.forEach(y => {
          const lineText = textLines[y].join(' ').trim()
          if (lineText) {
            // Simple heuristics for headings based on font size or position
            if (lineText.length < 50 && lineText === lineText.toUpperCase()) {
              htmlContent += `<h2>${this.escapeHtml(lineText)}</h2>`
            } else {
              htmlContent += `<p>${this.escapeHtml(lineText)}</p>`
            }
          }
        })
        
        if (pageNum < totalPages) {
          htmlContent += '<hr>'
        }
      }
      
            console.log('Total HTML content length:', htmlContent.length)
      console.log('HTML preview:', htmlContent.substring(0, 200))
      
      // If no content was extracted, try alternative method
      if (!htmlContent || htmlContent.length < 10) { // Less than 10 chars means probably just <hr> tags
        console.log('No text extracted with standard method, trying alternative approach...')
        htmlContent = await this.tryAlternativePDFExtraction(pdf, totalPages)
      }
      
      // If still no content, provide helpful message
      if (!htmlContent || htmlContent.length < 50) {
        htmlContent = `
          <div>
            <h2>Unable to Extract Text from PDF</h2>
            <p>This PDF appears to have no extractable text content. This usually happens with:</p>
            <ul>
              <li>Scanned documents (image-based PDFs)</li>
              <li>PDFs with embedded fonts that can't be decoded</li>
              <li>Copy-protected PDFs</li>
            </ul>
            <h3>What you can do:</h3>
            <ol>
              <li><strong>Check if text is selectable:</strong> Open the PDF and try to select text. If you can't, it's image-based.</li>
              <li><strong>Convert to DOCX:</strong> Use an online converter like SmallPDF to convert to Word format, then upload the DOCX.</li>
              <li><strong>Copy and paste:</strong> If you can select text in the PDF, copy it and paste into a text file, then upload that.</li>
              <li><strong>Try a different PDF:</strong> Test with a PDF you know has selectable text.</li>
            </ol>
            <p><em>File: ${file.name} (${totalPages} pages)</em></p>
          </div>
        `
      }
      
      return {
        html: htmlContent,
        metadata: {
          pageCount: totalPages,
          title: file.name.replace('.pdf', ''),
          fileType: 'pdf',
          warning: htmlContent.includes('Unable to Extract') ? 'No text could be extracted from this PDF' : undefined
        }
      }
    } catch (error) {
      console.error('PDF processing error:', error)
      throw new Error(`Failed to process PDF: ${error.message}`)
    }
  }

  async processDOCX(file, onProgress) {
    onProgress?.(0, 'Converting DOCX...')
    
    const arrayBuffer = await file.arrayBuffer()
    
    const result = await mammoth.convertToHtml({ arrayBuffer })
    
    onProgress?.(100, 'Conversion complete')
    
    return {
      html: result.value || '<p>No content found in document</p>',
      metadata: {
        title: file.name.replace('.docx', ''),
        fileType: 'docx',
        messages: result.messages
      }
    }
  }

  async processDOC(file, onProgress) {
    // DOC files can sometimes be processed by mammoth as well
    try {
      return await this.processDOCX(file, onProgress)
    } catch {
      // Fallback for older DOC formats
      onProgress?.(0, 'Processing DOC file...')
      const text = await file.text()
      return this.processTXT(new File([text], file.name, { type: 'text/plain' }), onProgress)
    }
  }

  async processTXT(file, onProgress) {
    onProgress?.(0, 'Processing text file...')
    
    const text = await file.text()
    
    // Convert line breaks to paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
    const html = paragraphs.map(p => {
      // Escape HTML and preserve single line breaks
      const escaped = this.escapeHtml(p)
      const withBreaks = escaped.replace(/\n/g, '<br>')
      return `<p>${withBreaks}</p>`
    }).join('')
    
    onProgress?.(100, 'Processing complete')
    
    return {
      html: html || '<p>Empty document</p>',
      metadata: {
        title: file.name.replace('.txt', ''),
        fileType: 'txt',
        characterCount: text.length
      }
    }
  }

  async processMD(file, onProgress) {
    onProgress?.(0, 'Processing Markdown...')
    
    const text = await file.text()
    
    // Enhanced markdown to HTML conversion
    let html = text
    
    // Escape HTML entities first to prevent XSS
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    
    // Function to escape HTML in non-code content
    const escapeHtml = (str) => {
      return str.replace(/[&<>"']/g, (m) => escapeMap[m])
    }
    
    // Preserve code blocks and inline code temporarily
    const codeBlocks = []
    const inlineCodes = []
    
    // Extract code blocks first
    html = html.replace(/```([\s\S]*?)```/g, (match, code) => {
      codeBlocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`)
      return `__CODE_BLOCK_${codeBlocks.length - 1}__`
    })
    
    // Extract inline code
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      inlineCodes.push(`<code>${escapeHtml(code)}</code>`)
      return `__INLINE_CODE_${inlineCodes.length - 1}__`
    })
    
    // Now escape HTML in the remaining content
    html = escapeHtml(html)
    
    // Headers (h1-h6)
    html = html.replace(/^###### (.*$)/gim, '<h6>$1</h6>')
    html = html.replace(/^##### (.*$)/gim, '<h5>$1</h5>')
    html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>')
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>')
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>')
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>')
    
    // Horizontal rules
    html = html.replace(/^(-{3,}|_{3,}|\*{3,})$/gim, '<hr>')
    
    // Blockquotes
    html = html.replace(/^&gt; (.+)$/gim, '<blockquote><p>$1</p></blockquote>')
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')
    
    // Bold (must come before italic to handle **_text_**)
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
    
    // Italic
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
    html = html.replace(/_([^_]+)_/g, '<em>$1</em>')
    
    // Strikethrough
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')
    
    // Links with title
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\s+"([^"]+)"\)/g, '<a href="$2" title="$3">$1</a>')
    // Links without title
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    
    // Images with alt text
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width: 100%;">')
    
    // Task lists
    html = html.replace(/^- \[x\] (.+)$/gim, '<li style="list-style: none;"><input type="checkbox" checked disabled> $1</li>')
    html = html.replace(/^- \[ \] (.+)$/gim, '<li style="list-style: none;"><input type="checkbox" disabled> $1</li>')
    
    // Unordered lists (handle nested lists)
    html = html.replace(/^(\s*)\* (.+)$/gim, (match, spaces, content) => {
      const level = spaces.length / 2
      return `${'  '.repeat(level)}<li data-level="${level}">${content}</li>`
    })
    html = html.replace(/^- (.+)$/gim, '<li>$1</li>')
    
    // Ordered lists
    html = html.replace(/^(\d+)\. (.+)$/gim, '<li data-ordered="true">$2</li>')
    
    // Process lists into proper nested structure
    const lines = html.split('\n')
    const processedLines = []
    let inList = false
    let listType = null
    let currentLevel = 0
    
    for (const line of lines) {
      if (line.includes('<li')) {
        const isOrdered = line.includes('data-ordered="true"')
        const level = parseInt(line.match(/data-level="(\d+)"/)?.['1'] || '0')
        
        if (!inList) {
          listType = isOrdered ? 'ol' : 'ul'
          processedLines.push(`<${listType}>`)
          inList = true
          currentLevel = level
        } else if (level > currentLevel) {
          // Start nested list
          listType = isOrdered ? 'ol' : 'ul'
          processedLines.push(`<${listType}>`)
          currentLevel = level
        } else if (level < currentLevel) {
          // Close nested lists
          for (let i = currentLevel; i > level; i--) {
            processedLines.push(`</${listType}>`)
          }
          currentLevel = level
        }
        
        // Clean up the li tag
        const cleanedLine = line
          .replace(/ data-level="\d+"/g, '')
          .replace(/ data-ordered="true"/g, '')
        processedLines.push(cleanedLine)
      } else if (inList && line.trim() === '') {
        // Empty line might end the list
        continue
      } else {
        // Not a list item
        if (inList) {
          // Close all open lists
          for (let i = currentLevel; i >= 0; i--) {
            processedLines.push(`</${listType}>`)
          }
          inList = false
          currentLevel = 0
        }
        processedLines.push(line)
      }
    }
    
    // Close any remaining open lists
    if (inList) {
      for (let i = currentLevel; i >= 0; i--) {
        processedLines.push(`</${listType}>`)
      }
    }
    
    html = processedLines.join('\n')
    
    // Tables (simple implementation)
    html = html.replace(/\|(.+)\|/g, (match, content) => {
      if (content.includes('---')) {
        return '' // Skip separator rows
      }
      const cells = content.split('|').map(cell => cell.trim())
      const cellTags = cells.map(cell => `<td>${cell}</td>`).join('')
      return `<tr>${cellTags}</tr>`
    })
    // Wrap table rows in table tags
    html = html.replace(/(<tr>[\s\S]+?<\/tr>)/g, '<table style="border-collapse: collapse; width: 100%;">$1</table>')
    
    // Restore code blocks and inline code
    codeBlocks.forEach((code, index) => {
      html = html.replace(`__CODE_BLOCK_${index}__`, code)
    })
    inlineCodes.forEach((code, index) => {
      html = html.replace(`__INLINE_CODE_${index}__`, code)
    })
    
    // Line breaks (two spaces at end of line)
    html = html.replace(/ {2}$/gm, '<br>')
    
    // Paragraphs - wrap remaining text
    html = html.split(/\n\n+/).map(block => {
      block = block.trim()
      if (block && !block.match(/^<(h[1-6]|ul|ol|li|blockquote|pre|table|tr|hr)/)) {
        return `<p>${block}</p>`
      }
      return block
    }).filter(block => block).join('\n')
    
    // Clean up any remaining newlines within paragraphs
    html = html.replace(/<p>([^<]+)<\/p>/g, (match, content) => {
      return `<p>${content.replace(/\n/g, ' ')}</p>`
    })
    
    // Add some basic styling for better appearance in the editor
    html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
        ${html}
      </div>
    `
    
    onProgress?.(100, 'Processing complete')
    
    return {
      html: html || '<p>Empty document</p>',
      metadata: {
        title: file.name.replace('.md', ''),
        fileType: 'md'
      }
    }
  }

  async processRTF(file, onProgress) {
    onProgress?.(0, 'Processing RTF...')
    
    // RTF is complex to parse properly in the browser
    // For now, we'll extract visible text
    const text = await file.text()
    
    // Remove RTF control words and groups
    let plainText = text
      .replace(/\\[a-z]+\d*\s?/gi, '') // Remove control words
      .replace(/[{}]/g, '') // Remove braces
      .replace(/\\'/g, '') // Remove escaped quotes
      .trim()
    
    // Convert to HTML paragraphs
    const paragraphs = plainText.split(/\n\n+/).filter(p => p.trim())
    const html = paragraphs.map(p => `<p>${this.escapeHtml(p)}</p>`).join('')
    
    onProgress?.(100, 'Processing complete')
    
    return {
      html: html || '<p>Could not extract text from RTF file</p>',
      metadata: {
        title: file.name.replace('.rtf', ''),
        fileType: 'rtf',
        warning: 'RTF formatting may not be fully preserved'
      }
    }
  }

  async tryAlternativePDFExtraction(pdf, totalPages) {
    console.log('Attempting alternative PDF text extraction...')
    let htmlContent = ''
    
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        const page = await pdf.getPage(pageNum)
        
        // Try method 1: Different text content options
        let textContent = await page.getTextContent({
          normalizeWhitespace: false,
          disableCombineTextItems: true,
          includeMarkedContent: true
        })
        
        console.log(`Alternative extraction - Page ${pageNum}: ${textContent.items.length} items`)
        
        // Check for any non-empty text
        let pageText = textContent.items
          .map(item => item.str)
          .filter(str => str && str.trim())
          .join(' ')
        
        // If still no text, try getting the page's operator list
        if (!pageText) {
          console.log('No text found with alternative method, checking page content type...')
          const ops = await page.getOperatorList()
          console.log(`Page ${pageNum} has ${ops.fnArray.length} operations`)
          
          // Check if page has any text operations
          const hasText = ops.fnArray.some(fn => 
            fn === pdfjsLib.OPS.showText || 
            fn === pdfjsLib.OPS.showSpacedText ||
            fn === pdfjsLib.OPS.nextLineShowText
          )
          
          if (!hasText) {
            console.warn(`Page ${pageNum} appears to have no text content (might be image-based)`)
            htmlContent += `<p><em>[Page ${pageNum}: No text content detected - this might be a scanned/image page]</em></p>`
          }
        } else {
          htmlContent += `<p>${this.escapeHtml(pageText)}</p>`
        }
        
        if (pageNum < totalPages) {
          htmlContent += '<hr>'
        }
      } catch (error) {
        console.error(`Error in alternative extraction for page ${pageNum}:`, error)
        htmlContent += `<p><em>[Page ${pageNum}: Error extracting text]</em></p>`
      }
    }
    
    return htmlContent
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// Export singleton instance
export default new DocumentProcessor() 