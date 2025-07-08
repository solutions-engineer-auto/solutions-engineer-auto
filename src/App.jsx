import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AccountDashboard from './pages/AccountDashboard'
import ProspectDetailPage from './pages/ProspectDetailPage'
import DocumentEditorPage from './pages/DocumentEditorPage'
import RequireAuth from './components/RequireAuth'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-b from-[#0A0F1E] to-[#05070C]">
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Protected routes */}
          <Route path="/accounts" element={
            <RequireAuth>
              <AccountDashboard />
            </RequireAuth>
          } />
          
          <Route path="/accounts/:id" element={
            <RequireAuth>
              <ProspectDetailPage />
            </RequireAuth>
          } />
          
          <Route path="/accounts/:accountId/documents/:docId" element={
            <RequireAuth>
              <DocumentEditorPage />
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
