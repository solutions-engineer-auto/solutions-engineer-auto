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
      
      // In a real app, we'd navigate to the document editor
      // For now, we'll just show a success message
      alert(`Document generated successfully! Document ID: ${data.documentId}`)
      
      // Refresh account data to show new document
      await fetchAccountDetails()
    } catch (error) {
      console.error('Failed to generate document:', error)
      alert('Failed to generate document. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading account details...</p>
        </div>
      </div>
    )
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Account not found</p>
          <button
            onClick={() => navigate('/accounts')}
            className="mt-4 text-indigo-600 hover:text-indigo-500"
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
        return 'bg-blue-100 text-blue-800'
      case 'Pre-Sales':
        return 'bg-indigo-100 text-indigo-800'
      case 'Pilot Deployment':
        return 'bg-purple-100 text-purple-800'
      case 'Post-Sale':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'finalized':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate('/accounts')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to accounts
        </button>

        {/* Account Summary Card */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {account.name}
                </h1>
                <p className="text-gray-600 mb-4">{account.description}</p>
                <div className="flex items-center space-x-4">
                  <div>
                    <span className="text-sm text-gray-500">Stage:</span>
                    <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageBadgeColor(account.stage)}`}>
                      {account.stage}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Value:</span>
                    <span className="ml-2 font-semibold text-indigo-600">{account.value}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Contact:</span>
                    <span className="ml-2 text-gray-900">{account.contact}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Document Section */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
          </div>
          <div className="px-6 py-6">
            {account.documents && account.documents.length > 0 ? (
              <div className="space-y-4">
                {account.documents.map(doc => (
                  <div key={doc.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.type}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Last modified: {new Date(doc.lastModified).toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(doc.status)}`}>
                        {doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-4 text-gray-500">No documents generated yet</p>
                <button
                  onClick={handleGenerateDocument}
                  disabled={generating}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M12 4v16m8-8H4" />
                      </svg>
                      Generate Suggested Document
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* File Upload Section (placeholder for Milestone 5) */}
        <div className="bg-white shadow-sm rounded-lg mt-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Context Files</h2>
          </div>
          <div className="px-6 py-6">
            <p className="text-sm text-gray-500">File upload will be implemented in Milestone 5</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProspectDetailPage 