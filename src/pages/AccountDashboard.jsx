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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-gray-600">Loading accounts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Account Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Welcome back, {userId}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white 
                         border border-gray-300 rounded-md hover:bg-gray-50
                         focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white shadow-sm rounded-lg mb-6 px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Stage
          </label>
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="block w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md shadow-sm
                     focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {stages.map(stage => (
              <option key={stage} value={stage}>
                {stage === 'all' ? 'All Stages' : stage}
              </option>
            ))}
          </select>
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
          <div className="text-center py-12">
            <p className="text-gray-500">No accounts found for the selected stage.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountDashboard 