/**
 * MermaidNode - TipTap node for Mermaid diagrams
 * 
 * This node handles the rendering and editing of Mermaid diagrams
 * within the TipTap editor.
 */

import { Node, mergeAttributes } from '@tiptap/core'
import { NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from '@tiptap/react'
import { useEffect, useRef, useState, useCallback } from 'react'
import mermaid from 'mermaid'
import { parseError, getSyntaxHints, validateDiagram } from './mermaidHelpers'

// Preview component for side-by-side editing
const MermaidPreview = ({ content }) => {
  const previewRef = useRef(null)
  const [previewError, setPreviewError] = useState(null)
  const [isRendering, setIsRendering] = useState(false)

  useEffect(() => {
    const renderPreview = async () => {
      if (!previewRef.current || !content) {
        setPreviewError(null)
        return
      }

      setIsRendering(true)
      setPreviewError(null)

      try {
        // Clear previous content
        previewRef.current.innerHTML = ''
        
        // Generate unique ID for preview
        const id = `mermaid-preview-${Date.now()}`
        
        // Create a div for the diagram
        const div = document.createElement('div')
        div.id = id
        div.textContent = content
        previewRef.current.appendChild(div)

        // Render the diagram
        await mermaid.run({
          querySelector: `#${id}`,
        })

        setIsRendering(false)
      } catch (err) {
        console.error('Preview error:', err)
        const errorInfo = parseError(err, content)
        setPreviewError(errorInfo)
        setIsRendering(false)
      }
    }

    // Debounce rendering
    const timer = setTimeout(renderPreview, 300)
    return () => clearTimeout(timer)
  }, [content])

  if (!content) {
    return (
      <div className="preview-empty">
        <div className="empty-icon">📊</div>
        <p>Start typing to see preview</p>
      </div>
    )
  }

  if (previewError) {
    return (
      <div className="preview-error">
        <div className="error-icon">⚠️</div>
        <h4>{previewError.message}</h4>
        <p className="error-suggestion">{previewError.suggestion}</p>
        {previewError.example && (
          <pre className="error-example">{previewError.example}</pre>
        )}
        {previewError.line && (
          <div className="error-line">
            Line {previewError.line.number}: <code>{previewError.line.content}</code>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="preview-container">
      {isRendering && (
        <div className="preview-loading">
          <div className="spinner-small"></div>
        </div>
      )}
      <div 
        ref={previewRef} 
        className="preview-content"
        style={{ display: isRendering ? 'none' : 'block' }}
      />
    </div>
  )
}

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  flowchart: {
    useMaxWidth: false,
    htmlLabels: true,
    rankSpacing: 50,
    nodeSpacing: 30,
    curve: 'basis'
  },
  themeVariables: {
    primaryColor: '#1e40af',
    primaryTextColor: '#e0e7ff',
    primaryBorderColor: '#3730a3',
    lineColor: '#06b6d4',
    secondaryColor: '#312e81',
    tertiaryColor: '#1e1b4b',
    background: '#0f172a',
    mainBkg: '#1e293b',
    secondBkg: '#334155',
    tertiaryBkg: '#475569',
    primaryColorDark: '#1e3a8a',
    nodeTextColor: '#e0e7ff',
    textColor: '#cbd5e1',
    edgeLabelBackground: '#1e293b',
    clusterBkg: '#1e293b',
    clusterBorder: '#475569',
    defaultLinkColor: '#06b6d4',
    titleColor: '#f8fafc',
    edgeLabelText: '#e2e8f0',
    actorBorder: '#3730a3',
    actorBkg: '#1e293b',
    actorTextColor: '#e0e7ff',
    actorLineColor: '#64748b',
    signalColor: '#06b6d4',
    signalTextColor: '#e0e7ff',
    labelBoxBkgColor: '#1e293b',
    labelBoxBorderColor: '#475569',
    labelTextColor: '#e0e7ff',
    loopTextColor: '#e0e7ff',
    noteBorderColor: '#475569',
    noteBkgColor: '#1e293b',
    noteTextColor: '#cbd5e1',
    activationBorderColor: '#06b6d4',
    activationBkgColor: '#1e293b',
    sequenceNumberColor: '#0f172a',
    sectionBkgColor: '#1e293b',
    altSectionBkgColor: '#334155',
    sectionBkgColor2: '#1e293b',
    excludeBkgColor: '#374151',
    taskBorderColor: '#3730a3',
    taskBkgColor: '#1e40af',
    taskTextColor: '#e0e7ff',
    taskTextDarkColor: '#0f172a',
    taskTextOutsideColor: '#cbd5e1',
    taskTextClickableColor: '#06b6d4',
    activeTaskBorderColor: '#06b6d4',
    activeTaskBkgColor: '#0891b2',
    gridColor: '#374151',
    doneTaskBkgColor: '#16a34a',
    doneTaskBorderColor: '#15803d',
    critBorderColor: '#dc2626',
    critBkgColor: '#991b1b',
    todayLineColor: '#06b6d4',
    personBorder: '#3730a3',
    personBkg: '#1e293b',
  },
  securityLevel: 'loose',
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
})

// Syntax helper component
const SyntaxHelper = ({ content }) => {
  const hints = getSyntaxHints(content)
  const issues = validateDiagram(content)
  
  return (
    <div className="syntax-helper">
      <div className="helper-section">
        <h5>Syntax Hints</h5>
        <ul className="hint-list">
          {hints.hints.map((hint, i) => (
            <li key={i}>{hint}</li>
          ))}
        </ul>
      </div>
      
      {issues.length > 0 && (
        <div className="helper-section">
          <h5>Issues</h5>
          <ul className="issue-list">
            {issues.map((issue, i) => (
              <li key={i} className={`issue-${issue.severity}`}>
                {issue.line && <span className="issue-line">Line {issue.line}: </span>}
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// React component for rendering Mermaid diagrams
const MermaidNodeView = ({ node, updateAttributes, selected }) => {
  const containerRef = useRef(null)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [tempContent, setTempContent] = useState(node.attrs.content)
  const [isRendering, setIsRendering] = useState(false)

  // Render the Mermaid diagram
  const renderDiagram = useCallback(async () => {
    if (!containerRef.current || !node.attrs.content) {
      return
    }

    setIsRendering(true)
    setError(null)

    try {
      // Clear previous content
      containerRef.current.innerHTML = ''
      
      // Generate unique ID for this diagram
      const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      
      // Create a div for the diagram
      const div = document.createElement('div')
      div.id = id
      div.textContent = node.attrs.content
      containerRef.current.appendChild(div)

      // Render the diagram
      await mermaid.run({
        querySelector: `#${id}`,
      })

      setIsRendering(false)
    } catch (err) {
      console.error('Mermaid rendering error:', err)
      setError(err.message || 'Failed to render diagram')
      setIsRendering(false)
    }
  }, [node.attrs.content])

  // Force complete edit/save cycle on mount to fix initial display issues
  useEffect(() => {
    if (node.attrs.content) {
      // Force a complete re-render cycle by simulating edit then save
      setIsEditing(true)
      setTempContent(node.attrs.content)
      
      setTimeout(() => {
        // Simulate clicking save
        updateAttributes({ content: node.attrs.content })
        setIsEditing(false)
      }, 50)
    }
  }, []) // Empty deps to run only on mount
  
  // Render diagram when content changes
  useEffect(() => {
    if (!isEditing && node.attrs.content) {
      renderDiagram()
    }
  }, [node.attrs.content, isEditing, renderDiagram])

  // Handle edit mode
  const handleEdit = () => {
    setIsEditing(true)
    setTempContent(node.attrs.content)
  }

  // Handle save
  const handleSave = () => {
    updateAttributes({ content: tempContent })
    setIsEditing(false)
  }

  // Handle cancel
  const handleCancel = () => {
    setTempContent(node.attrs.content)
    setIsEditing(false)
  }

  // Handle keyboard shortcuts in edit mode
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel()
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleSave()
    }
  }

  return (
    <NodeViewWrapper 
      className={`mermaid-node-wrapper ${selected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
    >
      {!isEditing ? (
        <div className="mermaid-display">
          {isRendering && (
            <div className="mermaid-loading">
              <div className="spinner"></div>
              <span>Rendering diagram...</span>
            </div>
          )}
          {error ? (
            <div className="mermaid-error">
              <div className="error-icon">⚠️</div>
              <div className="error-message">
                <strong>Diagram Error</strong>
                <p>{error}</p>
                <button onClick={handleEdit} className="edit-button">
                  Edit Diagram
                </button>
              </div>
            </div>
          ) : (
            <div 
              ref={containerRef} 
              className="mermaid-container"
              style={{ minHeight: '100px' }}
            />
          )}
          {!error && !isRendering && (
            <div className="mermaid-controls">
              <button onClick={handleEdit} className="edit-button" title="Edit diagram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="mermaid-editor">
          <div className="editor-header">
            <h3>Edit Mermaid Diagram</h3>
            <div className="editor-actions">
              <button onClick={handleCancel} className="cancel-button">
                Cancel (Esc)
              </button>
              <button onClick={handleSave} className="save-button">
                Save (⌘/Ctrl + Enter)
              </button>
            </div>
          </div>
          <div className="editor-content">
            <div className="editor-pane">
              <div className="pane-header">Code</div>
              <textarea
                value={tempContent}
                onChange={(e) => setTempContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="mermaid-textarea"
                placeholder="Enter your Mermaid diagram code here..."
                autoFocus
              />
              <SyntaxHelper content={tempContent} />
            </div>
            <div className="preview-pane">
              <div className="pane-header">Preview</div>
              <MermaidPreview content={tempContent} />
            </div>
          </div>
          <div className="editor-footer">
            <a 
              href="https://mermaid.js.org/syntax/examples.html" 
              target="_blank" 
              rel="noopener noreferrer"
              className="help-link"
            >
              Mermaid Syntax Reference →
            </a>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  )
}

// Define the Mermaid node
export const MermaidNode = Node.create({
  name: 'mermaid',
  
  group: 'block',
  
  atom: true,
  
  addAttributes() {
    return {
      content: {
        default: '',
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
        getAttrs: (dom) => ({
          content: dom.getAttribute('data-content') || dom.textContent,
        }),
      },
      {
        tag: 'pre',
        preserveWhitespace: 'full',
        getAttrs: (node) => {
          const codeBlock = node.querySelector('code.language-mermaid')
          if (codeBlock) {
            return { content: codeBlock.textContent }
          }
          return false
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'mermaid',
        'data-content': HTMLAttributes.content,
      }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  },

  addCommands() {
    return {
      insertMermaid: (content = '') => ({ commands }) => {
        return commands.insertContent({
          type: this.name,
          attrs: { content },
        })
      },
      
      updateMermaid: (content) => ({ commands }) => {
        return commands.updateAttributes(this.name, { content })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-m': () => this.editor.commands.insertMermaid(`flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]`),
    }
  },
})