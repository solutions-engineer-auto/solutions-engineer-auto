function AccountCard({ account, onClick }) {
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'finalized':
        return 'from-green-500/80 to-emerald-500/80 border-green-400/30'
      case 'draft':
        return 'from-amber-500/80 to-yellow-500/80 border-amber-400/30'
      default:
        return 'from-volcanic-ash/50 to-volcanic-ash-light/50 border-volcanic-ash/30'
    }
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
        return 'from-volcanic-ash/50 to-volcanic-ash-light/50 border-volcanic-ash/30'
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
      className="glass-panel glass-panel-hover p-6 cursor-pointer group relative overflow-hidden"
    >
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-volcanic-lava-orange/0 to-volcanic-lava-orange/0 
                      group-hover:from-volcanic-lava-orange/5 group-hover:to-volcanic-lava-red/5 
                      transition-all duration-500"></div>
      
      <div className="relative">
        {/* Account Name and Value */}
        <div className="mb-6">
          <h3 className="text-xl font-light text-volcanic-foam-light mb-2 group-hover:text-volcanic-foam transition-colors">
            {account.name}
          </h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-volcanic-lava-orange to-volcanic-lava-glow 
                       bg-clip-text text-transparent">
            {account.value}
          </p>
        </div>

        {/* Contact and Stage */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center text-sm text-volcanic-foam/70">
            <svg className="w-4 h-4 mr-2 text-volcanic-foam/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            {account.contact}
          </div>
          <div>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium 
                           bg-gradient-to-r ${getStageBadgeColor(account.stage)} 
                           backdrop-blur-glass border text-white shadow-sm`}>
              {account.stage}
            </span>
          </div>
        </div>

        {/* Document Status */}
        <div className="border-t border-volcanic-foam/10 pt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-volcanic-foam/60 font-light">Document Status</span>
            {account.documentStatus ? (
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium 
                             bg-gradient-to-r ${getStatusBadgeColor(account.documentStatus)} 
                             backdrop-blur-glass border text-white shadow-sm`}>
                {account.documentStatus}
              </span>
            ) : (
              <span className="text-xs text-volcanic-foam/40 italic">No document</span>
            )}
          </div>
          <div className="text-xs text-volcanic-foam/50 font-light">
            Last updated: {formatDate(account.lastUpdated)}
          </div>
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg className="w-5 h-5 text-volcanic-lava-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default AccountCard 