function AccountCard({ account, onClick }) {
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
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent 
                      group-hover:from-red-900/5 group-hover:to-red-800/5 
                      transition-all duration-500"></div>
      
      <div className="relative">
        {/* Account Name and Value */}
        <div className="mb-6">
          <h3 className="text-xl font-light text-white mb-2 group-hover:text-white/90 transition-colors">
            {account.name}
          </h3>
          <p className="text-3xl font-bold bg-gradient-to-r from-cyan-500 to-cyan-400 
                       bg-clip-text text-transparent">
            {account.value || '$0'}
          </p>
        </div>

        {/* Contact and Stage */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center text-sm text-white/70">
            <svg className="w-4 h-4 mr-2 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={account.contact ? '' : 'italic text-white/40'}>
              {account.contact || 'No contact specified'}
            </span>
          </div>
          <div>
            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium 
                           bg-gradient-to-r ${getStageBadgeColor(account.stage || 'Discovery')} 
                           backdrop-blur-sm border text-white shadow-sm`}>
              {account.stage || 'Discovery'}
            </span>
          </div>
        </div>

        {/* Last Updated */}
        <div className="border-t border-white/10 pt-4">
          <div className="text-xs text-white/50 font-light">
            Last updated: {formatDate(account.lastUpdated || account.last_updated || account.created_at)}
          </div>
        </div>

        {/* Hover indicator */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export default AccountCard 