import { useState, useEffect } from 'react'

function AgentActivity({ activity }) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (activity) {
      setIsVisible(true)
      const timer = setTimeout(() => {
        if (activity.type === 'tool_complete' || activity.type === 'action_change') {
          setIsVisible(false)
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [activity])

  if (!activity || !isVisible) return null

  const getActivityIcon = () => {
    switch (activity.type) {
      case 'tool_start':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-cyan-400/30 border-t-cyan-400"></div>
        )
      case 'tool_complete':
        return (
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )
      case 'action_change':
        return (
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        )
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <div className="w-4 h-4 rounded-full bg-cyan-400/20"></div>
        )
    }
  }

  const getActivityColor = () => {
    switch (activity.type) {
      case 'error':
        return 'from-red-500/20 to-red-400/20 border-red-400/30'
      case 'tool_complete':
        return 'from-green-500/20 to-green-400/20 border-green-400/30'
      default:
        return 'from-cyan-500/20 to-blue-400/20 border-cyan-400/30'
    }
  }

  return (
    <div className={`
      fixed bottom-8 right-8 z-50
      glass-panel p-4 pr-6
      bg-gradient-to-r ${getActivityColor()}
      transform transition-all duration-300 ease-out
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
      max-w-sm
    `}>
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {getActivityIcon()}
        </div>
        <div className="flex-1">
          <p className="text-sm text-white/90 font-light">
            {activity.message}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AgentActivity