import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import FileUploadDropzone from '../components/FileUploadDropzone'
import documentProcessor from '../services/documentProcessor'
import TemplateSelectionModal from '../components/TemplateSelectionModal'
import DocumentCreationModal from '../components/DocumentCreationModal'
import AccountDeletionModal from '../components/AccountDeletionModal'
import { KnowledgeGraph } from '../components/KnowledgeGraph'
import { GenerateDocumentModal } from '../components/GenerateDocumentModal'
import { v4 as uuidv4 } from 'uuid'
import Header from '../components/Header'

function ProspectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [dataSources, setDataSources] = useState([])
  const [processingFile, setProcessingFile] = useState(false)
  const [processingProgress, setProcessingProgress] = useState({ percent: 0, message: '' })
  const [multipleFilesProgress, setMultipleFilesProgress] = useState([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [showDocumentModal, setShowDocumentModal] = useState(false)
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [generatingDocumentId, setGeneratingDocumentId] = useState(null)
  const [isEditingAccount, setIsEditingAccount] = useState(false)
  const [editedAccount, setEditedAccount] = useState({})
  const [isSavingAccount, setIsSavingAccount] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [viewMode, setViewMode] = useState(() => {
    // Load view preference from localStorage
    return localStorage.getItem(`viewMode_${id}`) || 'list'
  })

  const stageOptions = ['Discovery', 'Pre-Sales', 'Pilot Deployment', 'Post-Sale']

  const fetchAccountDetails = async () => {
    try {
      setLoading(true);
      // Fetch account details
      const { data: accountData, error: accountError } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (accountError) throw accountError;
      if (!accountData) throw new Error('Account not found');

      // Fetch associated documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*')
        .eq('account_id', id);
      
      if (documentsError) throw documentsError;

      // Combine and set state
      setAccount({ ...accountData, documents: documentsData || [] });
      await fetchAccountDataSources();

    } catch (error) {
      console.error('Failed to fetch account details:', error.message);
    } finally {
      setLoading(false)
    }
  }
  
  const fetchAccountDataSources = async () => {
    try {
      const { data, error } = await supabase
        .from('account_data_sources')
        .select('*')
        .eq('account_id', id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDataSources(data || []);
    } catch (error) {
      console.error('Failed to fetch account data sources:', error);
    }
  };


  useEffect(() => {
    fetchAccountDetails()
  }, [id])


  const handleGenerateDocument = async () => {
    setShowDocumentModal(true)
  }

  const handleAIGenerateDocument = async (prompt, docId = null, isComplete = false) => {
    // If this is the completion callback
    if (isComplete && docId) {
      // Close modal
      setShowGenerateModal(false);
      setGeneratingDocumentId(null);
      
      // Navigate to the completed document
      navigate(`/accounts/${account.id}/documents/${docId}`);
      return;
    }
    
    // Otherwise, this is the initial generation request
    setGenerating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Create document in Supabase
      const newDocumentId = uuidv4();
      const { data: newDoc, error } = await supabase
        .from('documents')
        .insert({
          id: newDocumentId,
          title: `AI Generated Document - ${new Date().toLocaleDateString()}`,
          account_id: account.id,
          author_id: user.id,
          generation_status: 'initializing',
          document_type: 'ai_generated'
        })
        .select()
        .single();
        
      if (error) throw error;
      
      if (newDoc) {
        // Store the document ID for the modal
        setGeneratingDocumentId(newDoc.id);
        
        // Start the agent generation
        const response = await fetch('/api/langgraph/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: newDoc.id,
            accountData: account,
            userId: user.id,
            prompt: prompt
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to start generation: ${response.statusText}`);
        }
        
        const result = await response.json();
      }
    } catch (error) {
      console.error('Failed to create document:', error);
      setGeneratingDocumentId(null);
      throw error;
    } finally {
      setGenerating(false);
    }
  }

  const handleCreateDocument = async (title) => {
    setGenerating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      const { data: newDoc, error } = await supabase
        .from('documents')
        .insert({
          title: title,
          account_id: account.id,
          author_id: user.id,
        })
        .select()
        .single()

      if (error) throw error
      
      // Close modal and navigate to the new document's editor page
      setShowDocumentModal(false)
      navigate(`/accounts/${id}/documents/${newDoc.id}`)
    } catch (error) {
      console.error('Failed to generate document:', error)
      alert('Failed to generate document. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const handleFileSelect = async (files) => {
    if (files.length === 0) return
    
    setProcessingFile(true)
    setMultipleFilesProgress([])
    
    const filesArray = Array.from(files)
    const totalFiles = filesArray.length
    let successCount = 0
    let failedFiles = []
    
    // Initialize progress for all files
    const initialProgress = filesArray.map((file, index) => ({
      id: index,
      name: file.name,
      percent: 0,
      message: 'Waiting...',
      status: 'pending'
    }))
    setMultipleFilesProgress(initialProgress)
    
    // Process files sequentially to avoid overwhelming the server
    for (let i = 0; i < filesArray.length; i++) {
      const file = filesArray[i]
      
      try {
        // Update progress for current file
        setMultipleFilesProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, message: `Processing ${file.name}...`, status: 'processing' } : p
        ))
        
        const result = await documentProcessor.processFile(file, (percent, message) => {
          setMultipleFilesProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, percent, message } : p
          ))
        })
        
        if (result.success) {
          // Update progress - saving
          setMultipleFilesProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, percent: 100, message: 'Saving to database...' } : p
          ))

          const { error } = await supabase
            .from('account_data_sources')
            .insert({
              account_id: id,
              file_name: file.name,
              file_type: file.type,
              content: result.html,
              metadata: result.metadata,
            })

          if (error) throw error
          
          successCount++
          
          // Update progress - complete
          setMultipleFilesProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, percent: 100, message: 'Complete!', status: 'success' } : p
          ))
        } else {
          failedFiles.push({ name: file.name, error: result.error })
          setMultipleFilesProgress(prev => prev.map((p, idx) => 
            idx === i ? { ...p, percent: 100, message: `Failed: ${result.error}`, status: 'error' } : p
          ))
        }
      } catch (error) {
        console.error('File processing or saving error:', error)
        failedFiles.push({ name: file.name, error: error.message })
        setMultipleFilesProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, percent: 100, message: `Error: ${error.message}`, status: 'error' } : p
        ))
      }
    }
    
    // Refresh data sources list
    await fetchAccountDataSources()
    
    // Show summary
    const summaryMessage = `Processed ${totalFiles} file${totalFiles > 1 ? 's' : ''}: ${successCount} successful${failedFiles.length > 0 ? `, ${failedFiles.length} failed` : ''}`
    setProcessingProgress({ percent: 100, message: summaryMessage })
    
    // Clear progress after delay
    setTimeout(() => {
      setProcessingFile(false)
      setProcessingProgress({ percent: 0, message: '' })
      setMultipleFilesProgress([])
    }, 3000)
  }

  const handleLoadIntoEditor = (document) => {
    // This functionality is currently disabled.
    console.log('Load into editor clicked for:', document)
  }

  const handleDocumentFileUpload = async (files) => {
    if (files.length === 0) return
    
    const file = files[0] // Process first file
    
    // Ask user for document title
    const title = window.prompt('Enter a title for this document:', file.name.replace(/\.[^/.]+$/, ''))
    if (!title) {
      // User cancelled
      return
    }
    
    setProcessingFile(true)
    setProcessingProgress({ percent: 0, message: `Processing ${file.name} for editing...` })
    
    try {
      // Process file to HTML
      const result = await documentProcessor.processFile(file, (percent, message) => {
        setProcessingProgress({ percent, message })
      })
      
      if (result.success) {
        setProcessingProgress({ percent: 90, message: 'Creating document...' })

        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")

        // Create new document in documents table
        const { data: newDoc, error } = await supabase
          .from('documents')
          .insert({
            title: title,
            content: result.html,
            document_type: null, // As requested, null for now
            account_id: id,
            author_id: user.id,
            status: 'draft'
          })
          .select()
          .single()

        if (error) throw error
        
        setProcessingProgress({ percent: 100, message: 'Document created! Redirecting...' })
        
        // Refresh documents list
        await fetchAccountDetails()
        
        // Wait a moment for user to see success message
        setTimeout(() => {
          // Navigate to the document editor
          navigate(`/accounts/${id}/documents/${newDoc.id}`)
        }, 1000)
        
      } else {
        alert(`Failed to process file: ${result.error}`)
        setProcessingFile(false)
        setProcessingProgress({ percent: 0, message: '' })
      }
    } catch (error) {
      console.error('Document creation error:', error)
      alert(`Failed to create document: ${error.message}`)
      setProcessingFile(false)
      setProcessingProgress({ percent: 0, message: '' })
    }
  }

  const handleCreateFromTemplate = async (template, title) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")

      // Create new document from template
      const { data: newDoc, error } = await supabase
        .from('documents')
        .insert({
          title: title,
          content: template.content, // Copy template content
          document_type: null,
          account_id: id,
          author_id: user.id,
          status: 'draft'
        })
        .select()
        .single()

      if (error) throw error
      
      // Close modal and navigate to editor
      setShowTemplateModal(false)
      navigate(`/accounts/${id}/documents/${newDoc.id}`)
      
    } catch (error) {
      console.error('Failed to create document from template:', error)
      alert(`Failed to create document from template: ${error.message}`)
    }
  }


  const deleteDocument = async (docId, e) => {
    // Stop event propagation to prevent navigation
    e.stopPropagation()
    
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this document? This action cannot be undone.'
    )
    
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId)

      if (error) throw error

      // Refresh documents list
      await fetchAccountDetails()
      
      // Show success message (you could use a toast library here)
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50'
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-white">Document deleted successfully</span>
        </div>
      `
      document.body.appendChild(successMessage)
      
      setTimeout(() => {
        if (successMessage && successMessage.parentNode) {
          successMessage.remove()
        }
      }, 3000)
      
    } catch (error) {
      console.error('Failed to delete document:', error)
      alert(`Failed to delete document: ${error.message}`)
    }
  }

  const deleteReferenceDocument = async (docId, e) => {
    // Stop event propagation if needed
    if (e) e.stopPropagation()
    
    const confirmDelete = window.confirm(
      'Are you sure you want to remove this reference file? This will remove it from the context but won\'t affect any documents created from it.'
    )
    
    if (!confirmDelete) return

    try {
      const { error } = await supabase
        .from('account_data_sources')
        .delete()
        .eq('id', docId)

      if (error) throw error

      await fetchAccountDataSources()
      
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50'
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-white">Reference file removed successfully</span>
        </div>
      `
      document.body.appendChild(successMessage)
      
      setTimeout(() => {
        if (successMessage && successMessage.parentNode) {
          successMessage.remove()
        }
      }, 3000)
      
    } catch (error) {
      console.error('Failed to remove reference document:', error)
      alert(`Failed to remove reference document: ${error.message}`)
    }
  }

  const toggleGlobalStatus = async (docId, currentIsGlobal) => {
    try {
      const newIsGlobal = !currentIsGlobal
      
      const { error } = await supabase
        .from('account_data_sources')
        .update({ is_global: newIsGlobal })
        .eq('id', docId)

      if (error) throw error

      await fetchAccountDataSources()
      
      // Notify global knowledge base to update
      window.dispatchEvent(new Event('globalKnowledgeUpdated'))
      
      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50'
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-white">Document ${newIsGlobal ? 'added to' : 'removed from'} company knowledge base</span>
        </div>
      `
      document.body.appendChild(successMessage)
      
      setTimeout(() => {
        if (successMessage && successMessage.parentNode) {
          successMessage.remove()
        }
      }, 3000)
      
    } catch (error) {
      console.error('Failed to toggle global status:', error)
      alert(`Failed to update document: ${error.message}`)
    }
  }

  // Load previously uploaded documents from sessionStorage
  // This is now handled by fetchAccountDataSources
  // useEffect(() => {
  //   const storageKey = `uploaded_docs_${id}`
  //   const stored = JSON.parse(sessionStorage.getItem(storageKey) || '[]')
  //   console.log('Loading uploaded documents from sessionStorage:', stored)
  //   setUploadedDocuments(stored)
  // }, [id])

  const handleSaveAccountDetails = async () => {
    setIsSavingAccount(true)
    try {
      const { error } = await supabase
        .from('accounts')
        .update({
          contact: editedAccount.contact,
          value: editedAccount.value,
          stage: editedAccount.stage,
          description: editedAccount.description
        })
        .eq('id', id)

      if (error) throw error

      // Update local state
      setAccount({ ...account, ...editedAccount })
      setIsEditingAccount(false)

      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50'
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-white">Account details updated successfully</span>
        </div>
      `
      document.body.appendChild(successMessage)
      
      setTimeout(() => {
        if (successMessage && successMessage.parentNode) {
          successMessage.remove()
        }
      }, 3000)
      
    } catch (error) {
      console.error('Failed to update account:', error)
      alert(`Failed to update account: ${error.message}`)
    } finally {
      setIsSavingAccount(false)
    }
  }

  const handleEditAccount = () => {
    setEditedAccount({
      contact: account.contact || '',
      value: account.value || '$0',
      stage: account.stage || 'Discovery',
      description: account.description || ''
    })
    setIsEditingAccount(true)
  }

  const handleCancelEdit = () => {
    setIsEditingAccount(false)
    setEditedAccount({})
  }

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      // First, delete all documents associated with this account
      const { error: docsError } = await supabase
        .from('documents')
        .delete()
        .eq('account_id', id)

      if (docsError) {
        console.error('Error deleting documents:', docsError)
        throw new Error(`Failed to delete documents: ${docsError.message}`)
      }

      // Second, delete all reference documents (data sources) for this account
      const { error: dataSourcesError } = await supabase
        .from('account_data_sources')
        .delete()
        .eq('account_id', id)

      if (dataSourcesError) {
        console.error('Error deleting data sources:', dataSourcesError)
        throw new Error(`Failed to delete reference files: ${dataSourcesError.message}`)
      }

      // Finally, delete the account itself
      const { error: accountError } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)

      if (accountError) {
        console.error('Error deleting account:', accountError)
        throw new Error(`Failed to delete account: ${accountError.message}`)
      }

      // Show success message
      const successMessage = document.createElement('div')
      successMessage.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50'
      successMessage.innerHTML = `
        <div class="flex items-center space-x-2">
          <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <span class="text-white">Account deleted successfully</span>
        </div>
      `
      document.body.appendChild(successMessage)
      
      // Remove the success message after 3 seconds
      setTimeout(() => {
        if (successMessage && successMessage.parentNode) {
          successMessage.remove()
        }
      }, 3000)
      
      // Navigate back to accounts after a short delay
      setTimeout(() => {
        navigate('/accounts')
      }, 1500)
      
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert(`Failed to delete account: ${error.message}`)
    } finally {
      setIsDeletingAccount(false)
      setShowDeleteModal(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-cyan-500"></div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-panel p-8 text-center">
          <p className="text-white/70 mb-4">Account not found</p>
          <button
            onClick={() => navigate('/accounts')}
            className="btn-volcanic"
          >
            Back to accounts
          </button>
        </div>
      </div>
    )
  }

  const getStageBadgeColor = (stage) => {
    switch (stage) {
      case 'Discovery':
        return 'from-blue-500/80 to-cyan-500/80 border-blue-400/30'
      case 'Pre-Sales':
        return 'from-purple-500/80 to-violet-500/80 border-purple-400/30'
      case 'Pilot Deployment':
        return 'from-indigo-500/80 to-purple-500/80 border-indigo-400/30'
      case 'Post-Sale':
        return 'from-emerald-500/80 to-green-500/80 border-emerald-400/30'
      default:
        return 'from-gray-600/50 to-gray-500/50 border-gray-400/30'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'new':
        return 'from-cyan-500/10 to-cyan-400/10 border-cyan-400/20 backdrop-blur-sm'
      case 'draft':
        return 'from-cyan-500/25 to-cyan-400/25 border-cyan-400/30 backdrop-blur-sm'
      case 'in_progress':
        return 'from-cyan-500/40 to-blue-500/40 border-cyan-400/40'
      case 'under_review':
        return 'from-blue-500/60 to-blue-600/60 border-blue-400/50'
      case 'ready_for_review':
        return 'from-blue-600/80 to-blue-700/80 border-blue-400/60'
      case 'finalized':
        return 'from-blue-600 to-cyan-500 border-cyan-400/80'
      default:
        return 'from-gray-600/50 to-gray-500/50 border-gray-400/30'
    }
  }

  // Filter templates from data sources
  const templates = dataSources.filter(source => 
    source.file_name && source.file_name.toUpperCase().includes('TEMPLATE')
  )

  return (
    <div className="min-h-screen relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-40 w-96 h-96 bg-red-900/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-40 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Header
          actions={
            <>
              <button
                onClick={() => navigate('/accounts')}
                className="btn-volcanic flex items-center space-x-2 group"
              >
                <svg className="w-5 h-5 group-hover:text-cyan-500 transition-colors rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Back to Dashboard</span>
              </button>
            </>
          }
        >
          <div>
            <h1 className="text-3xl font-light text-white tracking-wide">
              Account Details
            </h1>
            <p className="text-sm text-white/60 font-light">
              Manage documents and data sources for {account?.name || 'this account'}
            </p>
          </div>
        </Header>

        {/* Account Summary Card */}
        <div className="glass-panel mb-8 mt-8 p-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-light text-white">
                    Account Information
                  </h2>
                  {!isEditingAccount && (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={handleEditAccount}
                        className="btn-volcanic text-sm flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Details</span>
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="btn-volcanic text-sm flex items-center space-x-2 hover:border-red-500/50 hover:text-red-400 group"
                      >
                        <svg className="w-4 h-4 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <span>Delete Account</span>
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingAccount ? (
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-light text-white/80 mb-2">Description</label>
                      <textarea
                        value={editedAccount.description}
                        onChange={(e) => setEditedAccount({ ...editedAccount, description: e.target.value })}
                        className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                                 placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                                 focus:outline-none transition-all resize-none"
                        rows="3"
                        placeholder="Add a description..."
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-white/70 mb-6 max-w-2xl">{account.description || 'No description provided'}</p>
                )}
                
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-sm text-white/60 font-light">Stage</span>
                    {isEditingAccount ? (
                      <select
                        value={editedAccount.stage}
                        onChange={(e) => setEditedAccount({ ...editedAccount, stage: e.target.value })}
                        className="ml-3 px-4 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white 
                                 focus:bg-white/15 focus:border-cyan-400/50 focus:outline-none transition-all"
                      >
                        {stageOptions.map(stage => (
                          <option key={stage} value={stage} className="bg-gray-900">{stage}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`ml-3 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium 
                                     bg-gradient-to-r ${getStageBadgeColor(account.stage)} 
                                     backdrop-blur-sm border text-white shadow-sm`}>
                        {account.stage || 'Discovery'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-white/60 font-light">Value</span>
                    {isEditingAccount ? (
                      <input
                        type="text"
                        value={editedAccount.value}
                        onChange={(e) => setEditedAccount({ ...editedAccount, value: e.target.value })}
                        className="ml-3 px-4 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white 
                                 placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                                 focus:outline-none transition-all w-32"
                        placeholder="$0"
                      />
                    ) : (
                      <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-cyan-500 to-cyan-400 bg-clip-text text-transparent">
                        {account.value || '$0'}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-sm text-white/60 font-light">Contact</span>
                    {isEditingAccount ? (
                      <input
                        type="text"
                        value={editedAccount.contact}
                        onChange={(e) => setEditedAccount({ ...editedAccount, contact: e.target.value })}
                        className="ml-3 px-4 py-1.5 rounded-lg bg-white/10 border border-white/20 text-white 
                                 placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                                 focus:outline-none transition-all w-48"
                        placeholder="Contact name..."
                      />
                    ) : (
                      <span className="ml-3 text-white">{account.contact || 'Not specified'}</span>
                    )}
                  </div>
                </div>
                
                {isEditingAccount && (
                  <div className="flex items-center space-x-3 mt-6">
                    <button
                      onClick={handleSaveAccountDetails}
                      disabled={isSavingAccount}
                      className="btn-volcanic-primary inline-flex items-center space-x-2"
                    >
                      {isSavingAccount ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSavingAccount}
                      className="btn-volcanic"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Document Section */}
        <div className="glass-panel mb-8">
          <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-2xl font-light text-white">Documents</h2>
            <div className="flex items-center space-x-3">
              {/* AI Generate Button */}
              <button
                onClick={() => setShowGenerateModal(true)}
                disabled={generating}
                className="btn-volcanic-primary inline-flex items-center space-x-2 text-sm"
                title="Generate document with AI"
              >
                {/* AI/Sparkles Icon */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Generate Document</span>
              </button>

              {/* Create Empty Document Button */}
              <button
                onClick={handleGenerateDocument}
                disabled={generating}
                className="btn-volcanic inline-flex items-center space-x-2 text-sm"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    {/* Document Plus Icon */}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Create Empty Document</span>
                  </>
                )}
              </button>

              {/* Template Button - Show only if templates exist */}
              {templates.length > 0 && (
                <button
                  onClick={() => setShowTemplateModal(true)}
                  className="btn-volcanic inline-flex items-center space-x-2 text-sm relative"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Create from Template</span>
                  {/* Template count badge */}
                  <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {templates.length}
                  </span>
                </button>
              )}
            </div>
          </div>
          <div className="px-8 py-8">
            {account.documents && account.documents.length > 0 ? (
              <div className="space-y-4">
                {account.documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="glass-panel p-6 hover:bg-white/[0.08] transition-all cursor-pointer group"
                    onClick={() => navigate(`/accounts/${id}/documents/${doc.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <h3 className="font-medium text-white text-lg mb-2">{doc.title}</h3>
                        <p className="text-sm text-white/60 font-light">
                          Last modified: {new Date(doc.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium 
                                       bg-gradient-to-r ${getStatusBadgeColor(doc.status)} 
                                       backdrop-blur-sm border text-white shadow-sm`}>
                          {doc.status}
                        </span>
                        <button
                          onClick={(e) => deleteDocument(doc.id, e)}
                          className="p-2 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Delete document"
                        >
                          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        <svg className="w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <svg className="mx-auto h-20 w-20 text-white/20 mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-white/50 font-light mb-8">No documents generated yet</p>
                
                {/* Document Creation Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  {/* AI Generate Button */}
                  <button
                    onClick={() => setShowGenerateModal(true)}
                    disabled={generating}
                    className="btn-volcanic-primary inline-flex items-center space-x-2"
                    title="Generate document with AI"
                  >
                    {/* AI/Sparkles Icon */}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <span>Generate Document</span>
                  </button>

                  {/* Create Empty Document Button */}
                  <button
                    onClick={handleGenerateDocument}
                    disabled={generating}
                    className="btn-volcanic inline-flex items-center space-x-2"
                  >
                    {generating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        {/* Document Plus Icon */}
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Create Empty Document</span>
                      </>
                    )}
                  </button>

                  {/* Template Button - Show only if templates exist */}
                  {templates.length > 0 && (
                    <button
                      onClick={() => setShowTemplateModal(true)}
                      className="btn-volcanic inline-flex items-center space-x-2 relative"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span>Create from Template</span>
                      {/* Template count badge */}
                      <span className="absolute -top-2 -right-2 bg-cyan-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                        {templates.length}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Document Upload Section */}
          <div className="px-8 pb-8">
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="text-lg font-light text-white mb-4">Upload Document for Editing</h3>
              <p className="text-sm text-white/50 mb-4">Upload templates or incomplete documents to edit them in the document editor</p>
              
              <FileUploadDropzone 
                onFileSelect={handleDocumentFileUpload}
                maxFiles={1}
              />
              
              {/* Processing Progress for Document Upload */}
              {processingFile && processingProgress.message.includes('for editing') && (
                <div className="mt-6 glass-panel p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/70">{processingProgress.message}</span>
                    <span className="text-sm text-cyan-400">{Math.round(processingProgress.percent)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
                      style={{ width: `${processingProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* File Upload Section */}
        <div className="glass-panel">
          <div className="px-8 py-6 border-b border-white/10">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-light text-white">Context Files</h2>
                <p className="text-sm text-white/50 mt-2">Upload documents to extract and edit their content</p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setViewMode('list')
                    localStorage.setItem(`viewMode_${id}`, 'list')
                  }}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'list' 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setViewMode('graph')
                    localStorage.setItem(`viewMode_${id}`, 'graph')
                  }}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'graph' 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                      : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <div className="px-8 py-8">
            {viewMode === 'list' ? (
              <>
                <FileUploadDropzone 
                  onFileSelect={handleFileSelect}
                  maxFiles={10}
                />
                
                {/* Processing Progress */}
                {processingFile && !processingProgress.message.includes('for editing') && (
                  <div className="mt-6">
                    {/* Show individual file progress when processing multiple files */}
                    {multipleFilesProgress.length > 0 && (
                      <div className="space-y-3 mb-4">
                        {multipleFilesProgress.map((fileProgress) => (
                          <div key={fileProgress.id} className="glass-panel p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-white/70 truncate flex-1 mr-3">
                                {fileProgress.name}
                              </span>
                              <span className={`text-sm ${
                                fileProgress.status === 'success' ? 'text-emerald-400' :
                                fileProgress.status === 'error' ? 'text-red-400' :
                                fileProgress.status === 'processing' ? 'text-cyan-400' :
                                'text-white/50'
                              }`}>
                                {fileProgress.status === 'success' ? '✓' :
                                 fileProgress.status === 'error' ? '✗' :
                                 fileProgress.status === 'processing' ? `${Math.round(fileProgress.percent)}%` :
                                 '...'}
                              </span>
                            </div>
                            <div className="text-xs text-white/50 mb-1">{fileProgress.message}</div>
                            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={`h-full transition-all duration-300 ${
                                  fileProgress.status === 'success' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                  fileProgress.status === 'error' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                                  'bg-gradient-to-r from-cyan-500 to-cyan-400'
                                }`}
                                style={{ width: `${fileProgress.percent}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Summary message when all files are processed */}
                    {processingProgress.message && multipleFilesProgress.length === 0 && (
                      <div className="glass-panel p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-white/70">{processingProgress.message}</span>
                          <span className="text-sm text-cyan-400">{Math.round(processingProgress.percent)}%</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-300"
                            style={{ width: `${processingProgress.percent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Uploaded Documents */}
                {dataSources.length > 0 && (
                  <div className="mt-6">
                    <h3 className="text-sm font-medium text-white/70 mb-3">Uploaded Documents</h3>
                    <div className="space-y-3">
                      {dataSources.map(doc => (
                        <div key={doc.id} className="glass-panel p-4 hover:bg-white/5 transition-colors group">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-white font-medium">{doc.file_name}</p>
                              <p className="text-sm text-white/50">
                                {new Date(doc.created_at).toLocaleDateString()} • {doc.file_type}
                                {doc.is_global && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded-full border border-cyan-500/30">
                                    Company-wide
                                  </span>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2 ml-4">
                              <button
                                onClick={() => toggleGlobalStatus(doc.id, doc.is_global)}
                                className={`btn-volcanic text-sm px-4 py-2 flex items-center space-x-2 ${
                                  doc.is_global 
                                    ? 'border-cyan-500/30 text-cyan-400 hover:border-cyan-500/50' 
                                    : 'hover:border-cyan-500/30 hover:text-cyan-400'
                                }`}
                                title={doc.is_global ? "Remove from company knowledge base" : "Add to company knowledge base"}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                        d={doc.is_global 
                                          ? "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" // House icon for global
                                          : "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" // Users icon for sharing
                                        } />
                                </svg>
                                <span>{doc.is_global ? 'Company-wide' : 'Share Company-wide'}</span>
                              </button>
                              <button
                                onClick={() => handleLoadIntoEditor(doc)}
                                className="btn-volcanic text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={true}
                                title="Editing context documents will be available in a future update."
                              >
                                Edit in Editor
                              </button>
                              <button
                                onClick={(e) => deleteReferenceDocument(doc.id, e)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
                                title="Remove reference file"
                              >
                                <svg className="w-5 h-5 text-red-400 hover:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <KnowledgeGraph
                documents={dataSources}
                accountId={id}
                viewMode="account"
                height={600}
                showControls={true}
                showUpload={true}
                onFileDrop={handleFileSelect}
                className="rounded-lg"
              />
            )}
          </div>
        </div>
      </div>

      {/* Template Selection Modal */}
      <TemplateSelectionModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        templates={templates}
        onConfirm={handleCreateFromTemplate}
      />

      {/* Document Creation Modal */}
      <DocumentCreationModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        onConfirm={handleCreateDocument}
        isLoading={generating}
      />

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        accountName={account?.name || ''}
        isLoading={isDeletingAccount}
      />

      {/* Generate Document Modal */}
      <GenerateDocumentModal
        isOpen={showGenerateModal}
        onClose={() => {
          setShowGenerateModal(false);
          setGeneratingDocumentId(null);
        }}
        onSubmit={handleAIGenerateDocument}
        accountName={account?.name}
        documentId={generatingDocumentId}
      />
    </div>
  )
}

export default ProspectDetailPage 
