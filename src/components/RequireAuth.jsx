import { Navigate } from 'react-router-dom'

function RequireAuth({ children }) {
  // Check if user is authenticated by looking for userId in localStorage
  const isAuthenticated = localStorage.getItem('userId') !== null

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />
  }

  // Render children if authenticated
  return children
}

export default RequireAuth 