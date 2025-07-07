import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AccountCard from '../components/AccountCard'

function AccountDashboard() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('userId')
  
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState('all')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      const data = await response.json()
      setAccounts(data.accounts)
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('userId')
    navigate('/login')
  }

  // Get unique stages for filter
  const stages = ['all', ...new Set(accounts.map(acc => acc.stage))]
  
  // Filter accounts based on selected stage
  const filteredAccounts = selectedStage === 'all' 
    ? accounts 
    : accounts.filter(acc => acc.stage === selectedStage)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-volcanic-foam/20 border-t-volcanic-lava-orange"></div>
          <p className="mt-4 text-volcanic-foam/70 font-light">Loading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-volcanic-lava-orange/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-volcanic-foam/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="glass-panel mb-8 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-light text-volcanic-foam-light tracking-wide mb-1">
                Account Dashboard
              </h1>
              <p className="text-sm text-volcanic-foam/60 font-light">
                Welcome back, <span className="text-volcanic-lava-orange">{userId}</span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="btn-volcanic flex items-center space-x-2 group"
            >
              <svg className="w-5 h-5 group-hover:text-volcanic-lava-orange transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Filter Section */}
        <div className="glass-panel mb-8 p-6">
          <label className="block text-sm font-medium text-volcanic-foam/80 mb-3">
            Filter by Stage
          </label>
          <div className="flex flex-wrap gap-2">
            {stages.map(stage => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`px-4 py-2 rounded-xl font-light transition-all duration-300 ${
                  selectedStage === stage
                    ? 'bg-gradient-to-r from-volcanic-lava-red/80 to-volcanic-lava-orange/80 text-white shadow-lava-glow'
                    : 'glass-panel glass-panel-hover text-volcanic-foam/80'
                }`}
              >
                {stage === 'all' ? 'All Stages' : stage}
              </button>
            ))}
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map(account => (
            <AccountCard 
              key={account.id}
              account={account}
              onClick={() => navigate(`/accounts/${account.id}`)}
            />
          ))}
        </div>

        {filteredAccounts.length === 0 && (
          <div className="text-center py-16">
            <div className="glass-panel inline-block p-8">
              <svg className="w-16 h-16 mx-auto text-volcanic-foam/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-volcanic-foam/50 font-light">No accounts found for the selected stage.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountDashboard 