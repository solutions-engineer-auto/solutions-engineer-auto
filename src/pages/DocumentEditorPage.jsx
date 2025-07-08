import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import CodeBlock from '@tiptap/extension-code-block'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import TextAlign from '@tiptap/extension-text-align'
import TextStyle from '@tiptap/extension-text-style'
import AIChatPanel from '../components/AIChat/AIChatPanel'

function DocumentEditorPage() {
  const { accountId, docId } = useParams()
  const navigate = useNavigate()
  
  const [documentData, setDocumentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [initialContent, setInitialContent] = useState('')
  const [showAIChat, setShowAIChat] = useState(false)

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            class: 'text-white'
          }
        },
        // Disable codeBlock from StarterKit since we're adding our own
        codeBlock: false,
        // Configure list items
        listItem: {
          HTMLAttributes: {
            class: 'ml-4'
          }
        },
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc list-outside ml-6'
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal list-outside ml-6'
          }
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-orange-400 underline hover:text-orange-300'
        }
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-black/40 text-orange-300 p-4 rounded-lg font-mono text-sm'
        }
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-orange-400/30'
        }
      }),
      Placeholder.configure({
        placeholder: 'Start writing your document...'
      }),
      TextStyle,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify']
      })
    ],
    content: initialContent || '',
    onUpdate: () => {
      setIsDirty(true)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[500px] text-white/90'
      }
    },
    onCreate: ({ editor }) => {
      // Set content once editor is created
      if (initialContent) {
        editor.commands.setContent(initialContent)
      }
    },
    autofocus: 'end'
  })

  // Fetch document on mount
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        console.log('Fetching document with ID:', docId)
        const response = await fetch(`/api/documents/${docId}`)
        console.log('Response status:', response.status)
        
        if (!response.ok) {
          throw new Error(`Document fetch failed with status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Document data received:', data)
        
        setDocumentData(data)
        setInitialContent(data.content || '')
        
        // Load content into editor if it's ready
        if (editor && data.content) {
          editor.commands.setContent(data.content)
          setIsDirty(false)
        }
      } catch (error) {
        console.error('Failed to fetch document:', error)
        console.error('Document ID was:', docId)
        alert(`Failed to load document: ${error.message}`)
        // Temporarily comment out navigation to see the error
        // navigate(`/accounts/${accountId}`)
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [docId, accountId, navigate])

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent && documentData) {
      editor.commands.setContent(initialContent)
      setIsDirty(false)
    }
  }, [editor, initialContent, documentData])

  // Define handleSave before using it in useEffect
  const handleSave = useCallback(async () => {
    if (!isDirty || !editor) return
    
    setSaving(true)
    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editor.getHTML(),
          status: documentData?.status || 'draft'
        })
      })
      
      if (!response.ok) throw new Error('Failed to save')
      
      setIsDirty(false)
      // Show success toast or feedback
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save document')
    } finally {
      setSaving(false)
    }
  }, [isDirty, editor, docId, documentData])

  // Handle keyboard shortcuts
  useEffect(() => {
    // Ensure we have editor and are in browser environment
    if (!editor || typeof document === 'undefined') return

    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K for AI regeneration (UI ready, integration pending)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (editor && editor.state) {
          const { state } = editor
          const { selection } = state
          const text = state.doc.textBetween(selection.from, selection.to, ' ')
          if (text) {
            setSelectedText(text)
            setShowAIModal(true)
          }
        }
      }
      
      // Cmd+S or Ctrl+S for save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      
      // Cmd+Shift+L or Ctrl+Shift+L for AI Chat
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault()
        setShowAIChat(prev => !prev)
      }
    }

    // Add event listener
    window.document.addEventListener('keydown', handleKeyDown)
    
    // Cleanup
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, handleSave, setShowAIModal, setSelectedText, setShowAIChat])

  const handleFinalize = async () => {
    if (!confirm('Are you sure you want to finalize this document? This action cannot be undone.')) {
      return
    }

    if (!editor) return

    try {
      const response = await fetch(`/api/documents/${docId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editor.getHTML(),
          status: 'finalized'
        })
      })
      
      if (!response.ok) throw new Error('Failed to finalize')
      
      setDocumentData({ ...documentData, status: 'finalized' })
      setIsDirty(false)
      editor.setEditable(false)
    } catch (error) {
      console.error('Finalize failed:', error)
      alert('Failed to finalize document')
    }
  }

  const handleExport = async (format) => {
    try {
      const response = await fetch(`/api/documents/${docId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      })
      
      if (!response.ok) throw new Error('Export failed')
      
      const data = await response.json()
      // TODO: Implement actual download when backend is ready
      alert(`Export functionality ready - Backend will provide download at: ${data.downloadUrl}`)
      setShowExportModal(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export document')
    }
  }

  const ToolbarButton = ({ onClick, isActive, children, title, disabled }) => {
    const handleClick = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        onClick()
      }
    }
    
    return (
      <button
        type="button"
        onMouseDown={handleClick}
        disabled={disabled}
        title={title}
        className={`p-2 rounded-lg transition-all ${
          isActive 
            ? 'bg-orange-500/20 text-orange-400' 
            : 'hover:bg-white/5 text-white/70 hover:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {children}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#0A0F1E] to-[#05070C] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-orange-500/30 border-t-orange-500 mx-auto"></div>
          <p className="mt-4 text-white/70">Loading document...</p>
        </div>
      </div>
    )
  }

  const isFinalized = documentData?.status === 'finalized'

  return (
    <div className={`min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#0A0F1E] to-[#05070C] ${showAIChat ? 'ai-chat-open' : ''}`}>
      {/* Header */}
      <div className="glass-panel sticky top-0 z-20 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/accounts/${accountId}`)}
                className="text-white/70 hover:text-white transition-colors"
              >
                ← Back to Account
              </button>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-xl font-light text-white">Document Editor</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* AI Chat Button */}
              <button
                onClick={() => setShowAIChat(!showAIChat)}
                className="px-3 py-1.5 text-sm bg-white/[0.08] backdrop-blur-md border border-white/[0.15] rounded-lg text-white/90 hover:bg-white/[0.12] hover:border-orange-500/50 transition-all duration-300 flex items-center gap-2"
                title={showAIChat ? 'Close AI Assistant' : 'Open AI Assistant'}
              >
                <span>🤖</span>
                <span>AI Assistant</span>
              </button>
              
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                documentData?.status === 'finalized' 
                  ? 'bg-green-500/20 text-green-400'
                  : documentData?.status === 'ready_for_review'
                  ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-blue-500/20 text-blue-400'
              }`}>
                {documentData?.status || 'draft'}
              </div>
              
              {/* Save Status */}
              {!isFinalized && (
                <div className="text-sm text-white/50">
                  {saving ? 'Saving...' : isDirty ? 'Unsaved changes' : 'All changes saved'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      {editor && !isFinalized && (
        <div className="glass-panel border-b border-white/10">
          <div className="max-w-7xl mx-auto px-8 py-3">
            <div className="flex items-center space-x-2 flex-wrap gap-y-2">
              {/* Text Formatting */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Cmd+B)"
              >
                <strong>B</strong>
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Cmd+I)"
              >
                <em>I</em>
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline (Cmd+U)"
              >
                <u>U</u>
              </ToolbarButton>
              
              <div className="h-6 w-px bg-white/20"></div>
              
              {/* Headings */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
              >
                H1
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                H2
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                H3
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().setParagraph().run()}
                isActive={editor.isActive('paragraph')}
                title="Normal Text"
              >
                ¶
              </ToolbarButton>
              
              <div className="h-6 w-px bg-white/20"></div>
              
              {/* Text Alignment */}
              <ToolbarButton
                onClick={() => {
                  // Get current selection and ensure we only affect current block
                  const { selection } = editor.state
                  const pos = selection.$anchor.pos
                  editor.chain()
                    .focus()
                    .setTextSelection(pos)
                    .setTextAlign('left')
                    .run()
                }}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
              >
                ◀
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => {
                  const { selection } = editor.state
                  const pos = selection.$anchor.pos
                  editor.chain()
                    .focus()
                    .setTextSelection(pos)
                    .setTextAlign('center')
                    .run()
                }}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
              >
                ▬
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => {
                  const { selection } = editor.state
                  const pos = selection.$anchor.pos
                  editor.chain()
                    .focus()
                    .setTextSelection(pos)
                    .setTextAlign('right')
                    .run()
                }}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
              >
                ▶
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => {
                  const { selection } = editor.state
                  const pos = selection.$anchor.pos
                  editor.chain()
                    .focus()
                    .setTextSelection(pos)
                    .setTextAlign('justify')
                    .run()
                }}
                isActive={editor.isActive({ textAlign: 'justify' })}
                title="Justify"
              >
                ☰
              </ToolbarButton>
              
              <div className="h-6 w-px bg-white/20"></div>
              
              {/* Lists */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
              >
                • List
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
              >
                1. List
              </ToolbarButton>
              
              <div className="h-6 w-px bg-white/20"></div>
              
              {/* Other */}
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Blockquote"
              >
                " Quote
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                isActive={editor.isActive('codeBlock')}
                title="Code Block"
              >
                {'</>'}
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => {
                  const url = window.prompt('Enter URL:')
                  if (url) {
                    editor.chain().focus().setLink({ href: url }).run()
                  }
                }}
                isActive={editor.isActive('link')}
                title="Add Link"
              >
                🔗
              </ToolbarButton>
              
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                isActive={editor.isActive('highlight')}
                title="Highlight"
              >
                🖍️
              </ToolbarButton>
            </div>
          </div>
        </div>
      )}

      {/* Editor Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="glass-panel p-8">
          {isFinalized && (
            <div className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-lg mb-6">
              This document has been finalized and is read-only.
            </div>
          )}
          
          {editor && (
            <EditorContent 
              editor={editor} 
              className={isFinalized ? 'opacity-70' : ''}
            />
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-8">
          <div className="flex items-center space-x-4">
            {!isFinalized && (
              <>
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="btn-volcanic-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                
                <button
                  onClick={handleFinalize}
                  className="btn-volcanic"
                >
                  Finalize Document
                </button>
              </>
            )}
          </div>
          
          <button
            onClick={() => setShowExportModal(true)}
            disabled={!isFinalized}
            className="btn-volcanic disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Export Document
          </button>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-light text-white mb-6">Export Document</h2>
            <p className="text-white/70 mb-6">Choose your export format:</p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleExport('pdf')}
                className="w-full btn-volcanic-primary"
              >
                Export as PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="w-full btn-volcanic-primary"
              >
                Export as DOCX
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full btn-volcanic"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Regeneration Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel p-8 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-light text-white mb-6">AI Text Regeneration</h2>
            <p className="text-sm text-orange-400 mb-4">[UI Ready - Backend Integration Pending]</p>
            <p className="text-white/70 mb-4">Selected text:</p>
            <div className="bg-black/40 p-4 rounded-lg mb-6 text-white/80 italic">
              "{selectedText}"
            </div>
            <p className="text-white/70 mb-6">
              How would you like to modify this text?
            </p>
            <textarea
              className="w-full p-3 bg-black/40 text-white rounded-lg border border-white/10 focus:border-orange-500/50 transition-colors outline-none"
              rows={3}
              placeholder="e.g., Make it more formal, add technical details, simplify..."
            />
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowAIModal(false)}
                className="btn-volcanic"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // TODO: Integrate with AI service when ready
                  alert('AI integration pending - this button is ready for backend connection')
                  setShowAIModal(false)
                }}
                className="btn-volcanic-primary"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Chat Panel */}
      <AIChatPanel 
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        documentContent={editor?.getText() || ''}
      />
    </div>
  )
}

export default DocumentEditorPage 