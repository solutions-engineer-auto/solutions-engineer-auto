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
            if (req.method === 'POST') {
              // Set environment variables from .env file
              process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
              process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              
              const streamHandler = await import('./api/langgraph/stream.js')
              await streamHandler.default(req, res)
              return true
            }
          }
        },
        '/api/langgraph/feedback': {
          target: 'http://localhost:5173',
          bypass: async (req, res) => {
            if (req.method === 'POST') {
              // Set environment variables from .env file
              process.env.LANGGRAPH_API_URL = env.LANGGRAPH_API_URL
              process.env.LANGGRAPH_API_KEY = env.LANGGRAPH_API_KEY
              
              const feedbackHandler = await import('./api/langgraph/feedback.js')
              await feedbackHandler.default(req, res)
              return true
            }
          }
        }
      }
    }
  }
})