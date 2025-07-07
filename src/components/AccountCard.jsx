function AccountCard({ account, onClick }) {
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

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 
                 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Account Name and Value */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          {account.name}
        </h3>
        <p className="text-2xl font-bold text-indigo-600">
          {account.value}
        </p>
      </div>

      {/* Contact and Stage */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          {account.contact}
        </div>
        <div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStageBadgeColor(account.stage)}`}>
            {account.stage}
          </span>
        </div>
      </div>

      {/* Document Status */}
      <div className="border-t pt-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">Document Status</span>
          {account.documentStatus ? (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(account.documentStatus)}`}>
              {account.documentStatus}
            </span>
          ) : (
            <span className="text-xs text-gray-400">No document</span>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Last updated: {formatDate(account.lastUpdated)}
        </div>
      </div>
    </div>
  )
}

export default AccountCard 