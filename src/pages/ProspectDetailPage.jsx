import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

function ProspectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchAccountDetails()
  }, [id])

  const fetchAccountDetails = async () => {
    try {
      const response = await fetch(`/api/accounts/${id}`)
      if (!response.ok) {
        throw new Error('Account not found')
      }
      const data = await response.json()
      setAccount(data)
    } catch (error) {
      console.error('Failed to fetch account:', error)
      // Could redirect to 404 or show error
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDocument = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: account.id,
          accountName: account.name,
          stage: account.stage
        })
      })
      
      const data = await response.json()
      
      // Navigate to the document editor
      navigate(`/accounts/${id}/documents/${data.documentId}`)
    } catch (error) {
      console.error('Failed to generate document:', error)
      alert('Failed to generate document. Please try again.')
    } finally {
      setGenerating(false)
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
        return 'from-blue-600 to-cyan-500 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
      default:
        return 'from-gray-600/50 to-gray-500/50 border-gray-400/30'
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-40 right-40 w-96 h-96 bg-red-900/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-40 left-40 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/accounts')}
          className="mb-6 flex items-center text-white/70 hover:text-white transition-colors group"
        >
          <svg className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-light">Back to accounts</span>
        </button>

        {/* Account Summary Card */}
        <div className="glass-panel mb-8 p-8 relative overflow-hidden">
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent"></div>
          
          <div className="relative">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-3xl font-light text-white mb-3">
                  {account.name}
                </h1>
                <p className="text-white/70 mb-6 max-w-2xl">{account.description}</p>
                
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <span className="text-sm text-white/60 font-light">Stage</span>
                    <span className={`ml-3 inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium 
                                   bg-gradient-to-r ${getStageBadgeColor(account.stage)} 
                                   backdrop-blur-sm border text-white shadow-sm`}>
                      {account.stage}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-white/60 font-light">Value</span>
                    <span className="ml-3 text-2xl font-bold bg-gradient-to-r from-cyan-500 to-cyan-400 bg-clip-text text-transparent">{account.value}</span>
                  </div>
                  <div>
                    <span className="text-sm text-white/60 font-light">Contact</span>
                    <span className="ml-3 text-white">{account.contact}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Section */}
        <div className="glass-panel mb-8">
          <div className="px-8 py-6 border-b border-white/10 flex justify-between items-center">
            <h2 className="text-2xl font-light text-white">Documents</h2>
            <button
              onClick={handleGenerateDocument}
              disabled={generating}
              className="btn-volcanic-primary inline-flex items-center space-x-2 text-sm"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Generate New Document</span>
                </>
              )}
            </button>
          </div>
          <div className="px-8 py-8">
            {account.documents && account.documents.length > 0 ? (
              <div className="space-y-4">
                {account.documents.map(doc => (
                  <div 
                    key={doc.id} 
                    className="glass-panel p-6 hover:bg-white/[0.08] transition-all cursor-pointer"
                    onClick={() => navigate(`/accounts/${id}/documents/${doc.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-white text-lg mb-2">{doc.type}</h3>
                        <p className="text-sm text-white/60 font-light">
                          Last modified: {new Date(doc.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium 
                                       bg-gradient-to-r ${getStatusBadgeColor(doc.status)} 
                                       backdrop-blur-sm border text-white shadow-sm`}>
                          {doc.status}
                        </span>
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
                <button
                  onClick={handleGenerateDocument}
                  disabled={generating}
                  className="btn-volcanic-primary inline-flex items-center space-x-3 group"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Generate Suggested Document</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* File Upload Section (placeholder for Milestone 5) */}
        <div className="glass-panel">
          <div className="px-8 py-6 border-b border-white/10">
            <h2 className="text-2xl font-light text-white">Context Files</h2>
          </div>
          <div className="px-8 py-8">
            <p className="text-sm text-white/50 font-light">File upload will be implemented in Milestone 5</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProspectDetailPage 