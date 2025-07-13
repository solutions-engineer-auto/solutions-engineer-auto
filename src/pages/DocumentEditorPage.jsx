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
import AIEditModal from '../components/AIEditModal'
import MermaidInsertModal from '../components/MermaidInsertModal'
import VoiceInputModal from '../components/AIChat/VoiceInputModal' // Import VoiceInputModal
import { supabase } from '../supabaseClient'
import AgentActivity from '../components/AgentActivity'
import { convertMarkdownToHtml } from '../utils/markdownToHtml'
import { DiffExtension } from '../extensions/DiffExtension'
import { MermaidExtension } from '../extensions/MermaidExtension'
import { useKeyboard } from '../utils/useKeyboard' // Import useKeyboard
import { DIFF_ENABLED } from '../utils/featureFlags'
import { getDirectAISuggestions } from '../services/directAIEditService'
import { processAIEdits } from '../utils/editProcessor'
import Header from '../components/Header'

function DocumentEditorPage() {
  const { accountId, docId } = useParams()
  const navigate = useNavigate()
  
  const [documentData, setDocumentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [initialContent, setInitialContent] = useState('')
  const [showAIChat, setShowAIChat] = useState(false)
  const [showAIEditModal, setShowAIEditModal] = useState(false)
  const [selectedTextForEdit, setSelectedTextForEdit] = useState('')
  const [showMermaidModal, setShowMermaidModal] = useState(false)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false) // Add state for voice modal
  
  // Agent integration states
  const [agentThreadId, setAgentThreadId] = useState(null)
  const [accountData, setAccountData] = useState(null)
  
  // Diff system states
  // These are commented out for future use when the UI is connected
  // const [showDiffUI, setShowDiffUI] = useState(false)
  // const [pendingChanges, setPendingChanges] = useState(0)

  const handleOpenVoiceModal = () => {
    if (!showAIChat) {
      setShowAIChat(true);
    }
    setIsVoiceModalOpen(true);
  };

  // Setup keyboard shortcut here, before useEditor
  useKeyboard({
    key: '.',
    ctrl: true,
    callback: handleOpenVoiceModal
  });

  // Handle AI edit request from DiffExtension
  const handleAIEditRequest = useCallback(({ selection }) => {
    console.log('[DiffExtension] AI edit requested:', selection)
    
    // Store the selection text for AI processing
    setSelectedTextForEdit(selection?.text || '')
    
    // Show the correct AI Edit modal (NOT the placeholder "AI Text Regeneration" modal)
    setShowAIEditModal(true)
    
    // Store selection info for later use
    window.tempSelectionInfo = selection
  }, [])

  // Handle accepting a change
  const handleAcceptChange = useCallback((changeId) => {
    console.log('[DiffExtension] Change accepted:', changeId)
    // The extension handles the actual change application
  }, [])

  // Handle rejecting a change
  const handleRejectChange = useCallback((changeId) => {
    console.log('[DiffExtension] Change rejected:', changeId)
    // The extension handles the actual change removal
  }, [])

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
      }),
      // Add MermaidExtension for diagram support
      MermaidExtension.configure({
        theme: 'dark',
        securityLevel: 'loose'
      }),
      // Add DiffExtension if feature is enabled
      DIFF_ENABLED ? DiffExtension.configure({
        onRequestEdit: handleAIEditRequest,
        onAcceptChange: handleAcceptChange,
        onRejectChange: handleRejectChange,
        enableKeyboardShortcuts: true,
        defaultMode: 'paragraph'
      }) : null
    ].filter(Boolean),
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
      
      // Subscribe to diff change events if enabled
      if (DIFF_ENABLED && editor.storage.diffV2) {
        const changeManager = editor.storage.diffV2.changeManager
        if (changeManager) {
          changeManager.subscribe(({ event, data }) => {
            if (event === 'change-added') {
              // setPendingChanges(prev => prev + 1) // This line was removed
              // setShowDiffUI(true) // This line was removed
            } else if (event === 'change-updated') {
              if (data.status !== 'pending') {
                // setPendingChanges(prev => Math.max(0, prev - 1)) // This line was removed
              }
            }
          })
        }
      }
    },
    autofocus: 'end'
  })

  // Expose editor instance for debugging/testing
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      window.editor = editor
    }
    return () => {
      if (window.editor === editor) {
        window.editor = null
      }
    }
  }, [editor])


  // Fetch document and account data on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let data
        const isUploadedDoc = docId && docId.startsWith('uploaded-')

        if (isUploadedDoc) {
          const docKey = `doc_content_${accountId}_${docId}`
          const storedDoc = sessionStorage.getItem(docKey)
          
          if (storedDoc) {
            data = JSON.parse(storedDoc)
          } else {
             // Fallback for older implementation that used a generic key
            const tempContent = sessionStorage.getItem('temp_document_content')
            if (tempContent) {
              const tempMetadata = JSON.parse(sessionStorage.getItem('temp_document_metadata') || '{}')
              data = {
                id: docId,
                content: tempContent,
                status: 'draft',
                title: tempMetadata.title || 'Uploaded Document'
              }
            } else {
              throw new Error('Uploaded document content not found in this session.')
            }
          }
        } else {
          // Fetch document from Supabase
          const { data: docData, error } = await supabase
            .from('documents')
            .select('*')
            .eq('id', docId)
            .single()
          
          if (error) throw error
          if (!docData) throw new Error('Document not found')
          
          data = docData
        }
        
        setDocumentData(data)
        const contentToLoad = data.content || ''
        setInitialContent(contentToLoad)
        
        if (editor) {
            if (editor.isDestroyed) return;
            editor.commands.setContent(contentToLoad)
            editor.setEditable(data.status !== 'finalized')
            setIsDirty(false)
        }
        
        // Set account data - always include the ID from URL params
        try {
          const accountResponse = await fetch(`/api/accounts/${accountId}`)
          if (accountResponse.ok) {
            const accData = await accountResponse.json()
            // Ensure the ID is always set from URL params
            const accountDataToSet = { ...accData, id: accountId };
            setAccountData(accountDataToSet)
          } else {
            // If fetch fails, still set accountData with the ID
            const fallbackData = { id: accountId, name: 'Account' };
            setAccountData(fallbackData)
          }
        } catch {
          // Even on error, set accountData with the ID
          const errorFallbackData = { id: accountId, name: 'Account' };
          setAccountData(errorFallbackData)
        }
      } catch (error) {
        console.error('Failed to fetch document:', error)
        alert(`Failed to load document: ${error.message}`)
        navigate(`/accounts/${accountId}`)
      } finally {
        setLoading(false)
      }
    }

    if(docId && accountId) {
        fetchData()
    }
  }, [docId, accountId, navigate, editor])

  // Update editor content when initialContent changes
  useEffect(() => {
    if (editor && initialContent && documentData) {
        if(editor.getHTML() !== initialContent) {
            editor.commands.setContent(initialContent)
        }
        setIsDirty(false)
    }
  }, [initialContent, documentData, editor])

  // Define handleSave before using it in useEffect
  const handleSave = useCallback(async () => {
    if (!isDirty || !editor) return
    
    setSaving(true)
    const isUploadedDoc = docId && docId.startsWith('uploaded-')
    const content = editor.getHTML()

    try {
      if (isUploadedDoc) {
        const docKey = `doc_content_${accountId}_${docId}`
        const existingDoc = JSON.parse(sessionStorage.getItem(docKey) || '{}')
        const updatedDocData = {
          ...documentData,
          ...existingDoc,
          content,
          lastSaved: new Date().toISOString()
        }
        sessionStorage.setItem(docKey, JSON.stringify(updatedDocData))
        setDocumentData(updatedDocData)
      } else {
        // Update document in Supabase
        const { error } = await supabase
          .from('documents')
          .update({ 
            content: content,
            // Note: updated_at will be automatically updated by the trigger in the database
          })
          .eq('id', docId)
        
        if (error) throw error
      }
      
      setIsDirty(false)
    } catch (error) {
      console.error('Save failed:', error)
      alert('Failed to save document')
    } finally {
      setSaving(false)
    }
  }, [isDirty, editor, docId, accountId, documentData])

  // Handle keyboard shortcuts
  useEffect(() => {
    // Ensure we have editor and are in browser environment
    if (!editor || typeof document === 'undefined') return

    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K for AI edit
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (editor && editor.state) {
          const { state } = editor
          const { selection } = state
          const text = state.doc.textBetween(selection.from, selection.to, ' ')
          if (text) {
            setSelectedTextForEdit(text)
            setShowAIEditModal(true)
          } else {
            // Show a hint if no text is selected
            const hintMessage = document.createElement('div')
            hintMessage.className = 'fixed bottom-4 left-1/2 transform -translate-x-1/2 glass-panel p-3 bg-cyan-500/20 border-cyan-500/30 z-50'
            hintMessage.innerHTML = '<span class="text-white text-sm">Select some text first, then press Cmd+K</span>'
            document.body.appendChild(hintMessage)
            setTimeout(() => hintMessage.remove(), 2000)
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
        // Only toggle on if it's closed. If it's open, the panel will handle its own closing animation
        if (!showAIChat) {
          setShowAIChat(true)
        }
      }
      
      // Cmd+D or Ctrl+D to toggle diff mode (if feature is enabled)
      if (DIFF_ENABLED && (e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault()
        if (editor) {
          editor.commands.toggleDiffMode()
          // setShowDiffUI(prev => !prev) // This line was removed
        }
      }
    }

    // Add event listener
    window.document.addEventListener('keydown', handleKeyDown)
    
    // Cleanup
    return () => {
      window.document.removeEventListener('keydown', handleKeyDown)
    }
  }, [editor, handleSave, setShowAIChat])

  // Removed document subscription - content now flows only through chat messages

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'finalized' && !confirm('Are you sure you want to finalize this document? This action cannot be undone.')) {
      return
    }

    if (!editor) return

    setSaving(true)
    try {
      // Update document status in Supabase
      const { error } = await supabase
        .from('documents')
        .update({ 
          content: editor.getHTML(),
          status: newStatus
        })
        .eq('id', docId)
      
      if (error) throw error
      
      setDocumentData({ ...documentData, status: newStatus })
      setIsDirty(false)
      
      // Make document read-only if finalized
      if (newStatus === 'finalized') {
        editor.setEditable(false)
      } else {
        editor.setEditable(true)
      }
    } catch (error) {
      console.error('Status update failed:', error)
      alert('Failed to update document status')
    } finally {
      setSaving(false)
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

  // Handle AI edit request submission
  const handleAIEditSubmit = useCallback(async (instruction) => {
    if (!editor || !selectedTextForEdit) return;
    
    let loadingMessage;
    try {
      // Show loading notification
      loadingMessage = document.createElement('div');
      loadingMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-cyan-500/20 border-cyan-500/30 z-50';
      loadingMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400/30 border-t-cyan-400"></span>
          <span class="text-white">Processing AI suggestions...</span>
        </div>
      `;
      document.body.appendChild(loadingMessage);
      
      // Request AI edit suggestions directly from OpenAI
      const aiResponse = await getDirectAISuggestions({
        text: selectedTextForEdit,
        instruction: instruction
      });
      
      // Process the AI response
      const result = processAIEdits(editor, aiResponse);
      
      // Remove loading notification
      if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.remove();
      }
      
      // ALWAYS close the modal first, before showing any notifications
      setShowAIEditModal(false);
      
      // Show appropriate message based on results
      if (result.successful > 0) {
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50';
        successMessage.innerHTML = `
          <div class="flex items-center space-x-2">
            <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span class="text-white">${result.successful} suggestion${result.successful > 1 ? 's' : ''} applied</span>
          </div>
        `;
        document.body.appendChild(successMessage);
        setTimeout(() => successMessage.remove(), 3000);
      } else if (result.errors.length > 0 && result.errors[0] !== 'No changes suggested by AI') {
        // Only show "no changes" message if it's not just an empty response
        const infoMessage = document.createElement('div');
        infoMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-cyan-500/20 border-cyan-500/30 z-50';
        infoMessage.innerHTML = `
          <div class="flex items-center space-x-2">
            <span class="text-cyan-400">ℹ️</span>
            <span class="text-white">No changes suggested for this text</span>
          </div>
        `;
        document.body.appendChild(infoMessage);
        setTimeout(() => infoMessage.remove(), 4000);
      }
      
      // Log results for debugging
      console.log('[AI Edit] Results:', result);
      if (result.errors.length > 0) {
        console.log('[AI Edit] Errors:', result.errors);
      }
      
    } catch (error) {
      console.error('[AI Edit] Error:', error);
      
      // Remove loading notification if it exists
      if (loadingMessage && loadingMessage.parentNode) {
        loadingMessage.remove();
      }
      
      // ALWAYS close modal on error
      setShowAIEditModal(false);
      
      // Show error notification
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-red-500/20 border-red-500/30 z-50';
      errorMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <span class="text-red-400">⚠️</span>
          <span class="text-white">Failed to get AI suggestions: ${error.message}</span>
        </div>
      `;
      document.body.appendChild(errorMessage);
      setTimeout(() => errorMessage.remove(), 5000);
    }
  }, [editor, selectedTextForEdit]);

  // Handle AI-generated document replacement
  const handleDocumentReplacement = useCallback((markdownContent) => {
    if (!editor) {
      return;
    }
    
    if (editor.isDestroyed) {
      return;
    }
    
    try {
      // Convert markdown to HTML
      const htmlContent = convertMarkdownToHtml(markdownContent);
      
      // Replace editor content
      editor.commands.setContent(htmlContent);
      
      // Mark as dirty so user can save
      setIsDirty(true);
      
      // Optionally close the AI chat panel
      // setShowAIChat(false);
    } catch {
      alert('Failed to replace document content. Please try again.');
    }
  }, [editor]);

  // Agent integration functions - moved to AI Chat
  // These are kept for potential future use but currently handled by AIChatPanel

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
            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50' 
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
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#0A0F1E] to-[#05070C]">
      <Header
        actions={
          <>
            {/* AI Chat Button */}
            <button
              onClick={() => setShowAIChat(!showAIChat)}
              className="px-4 py-2 text-sm bg-white/[0.08] backdrop-blur-sm border border-white/20 rounded-lg text-white/90 hover:bg-white/[0.12] hover:border-cyan-500/50 transition-all duration-300 flex items-center gap-2"
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
          </>
        }
      >
        <button
          onClick={() => {
            if (!accountId) {
              console.error('AccountId is undefined, navigating to accounts list')
              navigate('/accounts')
            } else {
              navigate(`/accounts/${accountId}`)
            }
          }}
          className="text-white/70 hover:text-white transition-colors relative z-30 px-3 py-2 rounded-lg hover:bg-white/10 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Account
        </button>
        <div className="h-6 w-px bg-white/20"></div>
        <h1 className="text-xl font-light text-white">Document Editor</h1>
      </Header>

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
              
              <div className="h-6 w-px bg-white/20"></div>
              
              {/* Mermaid Diagram Button */}
              <ToolbarButton
                onClick={() => setShowMermaidModal(true)}
                isActive={false}
                title="Insert Mermaid Diagram (Cmd+Alt+M)"
              >
                📊 Diagram
              </ToolbarButton>
              
              {/* Temporary Debug Button for Diff Testing */}
              {DIFF_ENABLED && (
                <>
                  <div className="h-6 w-px bg-white/20"></div>
                  <ToolbarButton
                    onClick={() => {
                      // Get current selection
                      const { selection } = editor.state;
                      
                      if (selection.empty) {
                        alert('Please select some text first');
                        return;
                      }
                      
                      // Get selected text
                      const selectedText = editor.state.doc.textBetween(selection.from, selection.to);
                      
                      // Store selection for AI edit
                      setSelectedTextForEdit(selectedText);
                      setShowAIEditModal(true);
                    }}
                    isActive={false}
                    title="Get AI edit suggestions for selected text (Cmd+K)"
                  >
                    🧪 AI Edit
                  </ToolbarButton>
                </>
              )}
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
                className="appearance-none bg-white/[0.08] backdrop-blur-md border border-white/[0.15] rounded-lg text-white/90 hover:bg-white/[0.12] hover:border-cyan-500/50 transition-all duration-300 px-4 py-2 pr-10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* AI Edit Modal */}
      <AIEditModal
        isOpen={showAIEditModal}
        onClose={() => setShowAIEditModal(false)}
        onSubmit={handleAIEditSubmit}
        selectedText={selectedTextForEdit}
      />

      {/* Mermaid Insert Modal */}
      <MermaidInsertModal
        isOpen={showMermaidModal}
        onClose={() => setShowMermaidModal(false)}
        onInsert={(content) => {
          if (editor) {
            editor.commands.insertContent({
              type: 'mermaid',
              attrs: { content }
            })
          }
        }}
      />

      {/* AI Chat Panel */}
      <AIChatPanel 
        isOpen={showAIChat}
        onClose={() => setShowAIChat(false)}
        documentContent={editor?.getText() || ''}
        accountData={accountData || { id: accountId, name: 'Loading...' }}
        documentId={docId}
        agentThreadId={agentThreadId}
        onThreadCreate={setAgentThreadId}
        onDocumentGenerated={handleDocumentReplacement}
        onMicrophoneClick={handleOpenVoiceModal} // Pass the handler
      />

      <VoiceInputModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSubmit={(transcript) => {
          // This assumes sendMessage is available here, which it isn't.
          // We'll need to lift the chat logic or use a different approach.
          // For now, let's just log it.
          console.log('Voice transcript submitted:', transcript);
          // A better approach would be to have a global event bus or context.
          // Let's create a temporary solution.
          window.postMessage({ type: 'SEND_AI_CHAT_MESSAGE', message: transcript }, '*');
          setIsVoiceModalOpen(false);
        }}
      />
      
      {/* Agent Activity Indicator */}
      <AgentActivity activity={null} />
    </div>
  )
}

export default DocumentEditorPage 