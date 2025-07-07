import { useNavigate } from 'react-router-dom'

function LoginPage() {
  const navigate = useNavigate()

  const handleDemoLogin = () => {
    // Store a demo user ID in localStorage
    const demoUserId = 'demo-engineer-001'
    localStorage.setItem('userId', demoUserId)
    
    // Redirect to accounts dashboard
    navigate('/accounts')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Solution Engineer Tool
          </h1>
          <p className="text-gray-600">
            Automate your document generation workflow
          </p>
        </div>
        
        <div className="space-y-4">
          <button
            onClick={handleDemoLogin}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-md hover:bg-indigo-700 
                     transition duration-200 font-medium text-lg shadow-sm
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Login as Demo Engineer
          </button>
          
          <p className="text-sm text-gray-500 text-center mt-4">
            This is a demo authentication. In production, this would use OAuth.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage 