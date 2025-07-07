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
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-400/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>
      
      {/* Login Card */}
      <div className="relative glass-panel glass-panel-hover p-10 w-full max-w-md shadow-xl shadow-blue-500/20">
        {/* Logo/Title Section */}
        <div className="text-center mb-10">
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/50">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-light text-white mb-2 tracking-wide">
            Solution Engineer Tool
          </h1>
          <p className="text-white/70 font-light">
            Automate your document generation workflow
          </p>
        </div>
        
        {/* Login Button */}
        <div className="space-y-6">
          <button
            onClick={handleDemoLogin}
            className="w-full btn-volcanic-primary text-lg font-medium flex items-center justify-center space-x-3 group"
          >
            <svg className="w-5 h-5 group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            <span>Login as Demo Engineer</span>
          </button>
          
          <div className="text-center">
            <p className="text-sm text-white/50 font-light">
              This is a demo authentication
            </p>
            <p className="text-xs text-white/40 mt-1">
              Production will use OAuth integration
            </p>
          </div>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="absolute -bottom-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>
      </div>
    </div>
  )
}

export default LoginPage 