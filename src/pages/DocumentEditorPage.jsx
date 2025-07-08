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
import ExportModal from '../components/ExportModal'

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
          class: 'text-cyan-400 underline hover:text-cyan-300'
        }
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: 'bg-black/40 text-cyan-300 p-4 rounded-lg font-mono text-sm'
        }
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-cyan-400/40'
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
        // Check if this is an uploaded document
        if (docId.startsWith('uploaded-')) {
          console.log('Loading uploaded document:', docId)
          
          // Try multiple storage locations for uploaded documents
          const docContentKey = `doc_content_${accountId}_${docId}`
          const savedKey = `saved_doc_${accountId}_${docId}`
          
          // Check for document content first
          let docData = sessionStorage.getItem(docContentKey)
          if (docData) {
            console.log('Found document in doc_content storage')
          } else {
            // Check for saved document
            docData = sessionStorage.getItem(savedKey)
            if (docData) {
              console.log('Found document in saved_doc storage')
            }
          }
          
          if (docData) {
            const parsedDoc = JSON.parse(docData)
            setDocumentData(parsedDoc)
            setInitialContent(parsedDoc.content || '')
            
            if (editor && parsedDoc.content) {
              editor.commands.setContent(parsedDoc.content)
              setIsDirty(false)
            }
          } else {
            // Try temporary storage for newly uploaded documents
            console.log('All sessionStorage keys:', Object.keys(sessionStorage))
            const tempContent = sessionStorage.getItem('temp_document_content')
            const tempMetadata = sessionStorage.getItem('temp_document_metadata')
            console.log('Content from temp sessionStorage:', tempContent ? `Found (${tempContent.length} chars)` : 'Not found')
            console.log('Temp content preview:', tempContent?.substring(0, 100))
            console.log('Metadata from sessionStorage:', tempMetadata)
            
            if (tempContent) {
            const metadata = tempMetadata ? JSON.parse(tempMetadata) : {}
            const data = {
              id: docId,
              content: tempContent,
              status: 'draft',
              title: metadata.title || 'Uploaded Document',
              metadata: metadata
            }
            
            setDocumentData(data)
            setInitialContent(data.content || '')
            
            // Load content into editor if it's ready
            if (editor && data.content) {
              editor.commands.setContent(data.content)
              setIsDirty(false)
            }
            
              // Clean up temporary storage
              sessionStorage.removeItem('temp_document_content')
              sessionStorage.removeItem('temp_document_metadata')
            } else {
              throw new Error('Uploaded document content not found')
            }
          }
        } else {
          // Fetch from API for regular documents
          const response = await fetch(`/api/documents/${docId}`)
          
          if (!response.ok) {
            throw new Error(`Document fetch failed with status: ${response.status}`)
          }
          
          const data = await response.json()
          
          setDocumentData(data)
          setInitialContent(data.content || '')
          
          // Load content into editor if it's ready
          if (editor && data.content) {
            editor.commands.setContent(data.content)
            setIsDirty(false)
          }
        }
      } catch (error) {
        console.error('Failed to fetch document:', error)
        alert(`Failed to load document: ${error.message}`)
        navigate(`/accounts/${accountId}`)
      } finally {
        setLoading(false)
      }
    }

    fetchDocument()
  }, [docId, accountId, navigate])

  // Update editor content when initialContent changes
  useEffect(() => {
    console.log('Editor content update effect:', {
      hasEditor: !!editor,
      hasInitialContent: !!initialContent,
      contentLength: initialContent?.length,
      hasDocumentData: !!documentData
    })
    
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
      // Handle uploaded documents differently
      if (docId.startsWith('uploaded-')) {
        // For uploaded documents, save to sessionStorage
        const storageKey = `saved_doc_${accountId}_${docId}`
        const savedData = {
          id: docId,
          content: editor.getHTML(),
          status: documentData?.status || 'draft',
          lastSaved: new Date().toISOString(),
          metadata: documentData?.metadata || {}
        }
        sessionStorage.setItem(storageKey, JSON.stringify(savedData))
        setIsDirty(false)
        
        // Update local state
        setDocumentData(prevData => ({
          ...prevData,
          content: editor.getHTML(),
          lastSaved: savedData.lastSaved
        }))
      } else {
        // Regular API save for generated documents
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
      }
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save document')
    } finally {
      setSaving(false)
    }
  }, [isDirty, editor, docId, documentData, accountId])

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

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'finalized' && !confirm('Are you sure you want to finalize this document? This action cannot be undone.')) {
      return
    }

    if (!editor) return

    try {
      if (docId.startsWith('uploaded-')) {
        // For uploaded documents, save to sessionStorage
        const storageKey = `saved_doc_${accountId}_${docId}`
        const savedData = {
          id: docId,
          content: editor.getHTML(),
          status: newStatus,
          lastSaved: new Date().toISOString(),
          metadata: documentData?.metadata || {}
        }
        sessionStorage.setItem(storageKey, JSON.stringify(savedData))
        
        setDocumentData({ ...documentData, status: newStatus })
        setIsDirty(false)
      } else {
        // Regular API update for generated documents
        const response = await fetch(`/api/documents/${docId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: editor.getHTML(),
            status: newStatus
          })
        })
        
        if (!response.ok) throw new Error('Failed to update status')
        
        setDocumentData({ ...documentData, status: newStatus })
        setIsDirty(false)
      }
      
      // Make document read-only if finalized
      if (newStatus === 'finalized') {
        editor.setEditable(false)
      } else {
        editor.setEditable(true)
      }
    } catch (error) {
      console.error('Status update failed:', error)
      alert('Failed to update document status')
    }
  }

  // Available document statuses
  const documentStatuses = [
    { value: 'new', label: 'New', color: 'bg-gradient-to-r from-cyan-500/10 to-cyan-400/10 border-2 border-cyan-400/20 text-cyan-300/70 backdrop-blur-sm' },
    { value: 'draft', label: 'Draft', color: 'bg-gradient-to-r from-cyan-500/25 to-cyan-400/25 border-2 border-cyan-400/30 text-cyan-300/80 backdrop-blur-sm' },
    { value: 'in_progress', label: 'In Progress', color: 'bg-gradient-to-r from-cyan-500/40 to-blue-500/40 border-2 border-cyan-400/40 text-cyan-300' },
    { value: 'under_review', label: 'Under Review', color: 'bg-gradient-to-r from-blue-500/60 to-blue-600/60 border-2 border-blue-400/50 text-blue-200' },
    { value: 'ready_for_review', label: 'Ready for Review', color: 'bg-gradient-to-r from-blue-600/80 to-blue-700/80 border-2 border-blue-400/60 text-blue-100' },
    { value: 'finalized', label: 'Finalized', color: 'bg-gradient-to-r from-blue-600 to-cyan-500 border-2 border-cyan-400/80 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]' }
  ]
  
  const currentStatusInfo = documentStatuses.find(s => s.value === documentData?.status) || documentStatuses[1]



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
        className={`
          px-3 py-2 rounded-lg font-medium text-sm
          border transition-all duration-200
          ${isActive 
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]' 
            : 'bg-white/[0.05] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white hover:border-white/20'
          } 
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        {children}
      </button>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#0A0F1E] to-[#05070C] p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500 mx-auto"></div>
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
                className="px-4 py-2 text-sm bg-white/[0.08] backdrop-blur-sm border border-white/20 rounded-lg text-white/90 hover:bg-white/[0.12] hover:border-cyan-500/50 hover:shadow-[0_0_12px_rgba(6,182,212,0.3)] transition-all duration-300 flex items-center gap-2"
                title={showAIChat ? 'Close AI Assistant' : 'Open AI Assistant'}
              >
                <span>🤖</span>
                <span>AI Assistant</span>
              </button>
              
              {/* Status Badge */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${currentStatusInfo.color}`}>
                {currentStatusInfo.label}
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
            <button
              onClick={handleSave}
              disabled={!isDirty || saving || isFinalized}
              className="btn-volcanic-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            
            {/* Status Dropdown */}
            <div className="relative">
              <select
                value={documentData?.status || 'draft'}
                onChange={(e) => handleStatusChange(e.target.value)}
                disabled={isFinalized}
                className="appearance-none bg-white/[0.08] backdrop-blur-md border border-white/[0.15] rounded-lg text-white/90 hover:bg-white/[0.12] hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 px-4 py-2 pr-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {documentStatuses.map(status => (
                  <option key={status.value} value={status.value} className="bg-[#0A0F1E]">
                    {status.label}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => setShowExportModal(true)}
            className="btn-volcanic"
          >
            Export Document
          </button>
        </div>
      </div>

      {/* Export Modal */}
      <ExportModal 
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        editor={editor}
        documentData={documentData}
      />

      {/* AI Regeneration Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass-panel p-8 max-w-lg w-full mx-4">
            <h2 className="text-2xl font-light text-white mb-6">AI Text Regeneration</h2>
            <p className="text-sm text-cyan-400 mb-4">[UI Ready - Backend Integration Pending]</p>
            <p className="text-white/70 mb-4">Selected text:</p>
            <div className="bg-black/40 p-4 rounded-lg mb-6 text-white/80 italic">
              "{selectedText}"
            </div>
            <p className="text-white/70 mb-6">
              How would you like to modify this text?
            </p>
            <textarea
              className="w-full p-3 bg-black/40 text-white rounded-lg border border-white/10 focus:border-cyan-500/50 focus:shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors outline-none"
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