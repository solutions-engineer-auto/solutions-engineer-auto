import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    server: {
      // Custom middleware for API routes
      proxy: {
        '/api/langgraph/stream': {
          target: 'http://localhost:5173',
          bypass: async (req, res) => {
            // Import and handle the SSE stream endpoint
            console.log(`[Vite Proxy] ${req.method} ${req.url}`)
            console.log('[Vite Proxy] Headers:', req.headers)
            
            if (req.method === 'POST') {
              // Set environment variables from .env file
              console.log('[Vite Proxy] Setting environment variables:')
              console.log('[Vite Proxy] LANGGRAPH_API_URL:', env.LANGGRAPH_API_URL || 'NOT SET')
              console.log('[Vite Proxy] LANGGRAPH_API_KEY:', env.LANGGRAPH_API_KEY ? '***' + env.LANGGRAPH_API_KEY.slice(-4) : 'NOT SET')
              
              process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
              process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              
              try {
                console.log('[Vite Proxy] Loading stream handler...')
                const streamHandler = await import('./api/langgraph/stream.js')
                console.log('[Vite Proxy] Executing stream handler...')
                await streamHandler.default(req, res)
                console.log('[Vite Proxy] Stream handler completed')
                return true
              } catch (error) {
                console.error('[Vite Proxy] Error in stream handler:', error)
                throw error
              }
            }
          }
        },
        '/api/langgraph/feedback': {
          target: 'http://localhost:5173',
          bypass: async (req, res) => {
            console.log(`[Vite Proxy] ${req.method} ${req.url}`)
            
            if (req.method === 'POST') {
              // Set environment variables from .env file
              console.log('[Vite Proxy] Setting environment variables for feedback endpoint')
              process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
              process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              
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
        '/api/langgraph/check-run': {
          target: 'http://localhost:5173',
          bypass: async (req, res) => {
            if (req.method === 'GET') {
              process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
              process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              
              const checkHandler = await import('./api/langgraph/check-run.js')
              await checkHandler.default(req, res)
              return true
            }
          }
        }
      }
    }
  }
})