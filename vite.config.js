import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Check if we're running in local mode
  const isLocalMode = env.VITE_LANGGRAPH_MODE === 'local' || mode === 'development'
  const localAgentUrl = env.VITE_LANGGRAPH_LOCAL_URL || 'http://localhost:8123'
  
  return {
    plugins: [react()],
    server: {
      // Custom middleware for API routes
      proxy: {
        '/api/langgraph/feedback': {
          target: 'http://localhost:5173',
          bypass: async (req, res) => {
            console.log(`[Vite Proxy] ${req.method} ${req.url}`)
            
            if (req.method === 'POST') {
              // Set environment variables from .env file
              console.log('[Vite Proxy] Setting environment variables for feedback endpoint')
              
              if (isLocalMode) {
                // Use local agent URL
                process.env.LANGGRAPH_API_URL = localAgentUrl
                process.env.LANGGRAPH_API_KEY = 'local-dev-key' // No API key needed for local
                console.log(`[Vite Proxy] Using local agent at ${localAgentUrl}`)
              } else {
                // Use cloud configuration
                process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
                process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              }
              
              try {
                console.log('[Vite Proxy] Loading feedback handler...')
                const feedbackHandler = await import('./api/langgraph/feedback.js')
                await feedbackHandler.default(req, res)
                console.log('[Vite Proxy] Feedback handler completed')
                return true
              } catch (error) {
                console.error('[Vite Proxy] Error in feedback handler:', error)
                throw error
              }
            }
          }
        },
        '/api/langgraph/start': {
          target: 'http://localhost:5173',
          bypass: async (req, res) => {
            // Handling start endpoint
            
            if (req.method === 'POST') {
              if (isLocalMode) {
                // Use local agent URL
                process.env.LANGGRAPH_API_URL = localAgentUrl
                process.env.LANGGRAPH_API_KEY = 'local-dev-key' // No API key needed for local
                console.log(`[Vite Proxy] Using local agent at ${localAgentUrl}`)
              } else {
                // Use cloud configuration
                process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
                process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              }
              
              try {
                const startHandler = await import('./api/langgraph/start.js')
                await startHandler.default(req, res)
                return true
              } catch (error) {
                console.error('[Start Error]:', error.message)
                throw error
              }
            }
          }
        }
      }
    }
  }
})