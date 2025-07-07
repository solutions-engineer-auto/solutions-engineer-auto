import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AccountDashboard from './pages/AccountDashboard'
import RequireAuth from './components/RequireAuth'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/accounts" element={
            <RequireAuth>
              <AccountDashboard />
            </RequireAuth>
          } />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/accounts" replace />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
