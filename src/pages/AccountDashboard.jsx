import { useNavigate } from 'react-router-dom'

function AccountDashboard() {
  const navigate = useNavigate()
  const userId = localStorage.getItem('userId')

  const handleLogout = () => {
    localStorage.removeItem('userId')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Account Dashboard
            </h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white 
                       border border-gray-300 rounded-md hover:bg-gray-50
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Logout
            </button>
          </div>
          
          <div className="text-gray-600">
            <p className="mb-2">Welcome, {userId}!</p>
            <p className="text-sm">Account list will be implemented in Milestone 3.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountDashboard 