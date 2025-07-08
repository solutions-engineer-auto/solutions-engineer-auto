import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Start MSW in development
async function enableMocking() {
  if (import.meta.env.PROD) {
    return
  }

  const { worker } = await import('./mocks/browser')
  
  // `worker.start()` returns a Promise that resolves
  // once the Service Worker is up and ready to intercept requests.
  return worker.start({
    onUnhandledRequest: (req) => {
      // Bypass requests for worker files and other static assets
      if (req.url.includes('.worker.') || req.url.includes('/node_modules/')) {
        return 'bypass'
      }
      // Bypass all /api/langgraph requests (handled by Vite proxy)
      if (req.url.includes('/api/langgraph')) {
        return 'bypass'
      }
      // Also bypass any non-API requests
      if (!req.url.includes('/api/')) {
        return 'bypass'
      }
      // For API requests not handled by MSW, warn
      console.warn('Unhandled API request:', req.url)
      return 'bypass'
    },
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
