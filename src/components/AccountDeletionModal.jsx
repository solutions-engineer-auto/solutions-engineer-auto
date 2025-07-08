import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function AccountDeletionModal({ isOpen, onClose, onConfirm, accountName, isLoading = false }) {
  const [confirmationText, setConfirmationText] = useState('')
  const [showError, setShowError] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('')
      setShowError(false)
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose, isLoading])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (confirmationText !== accountName) {
      setShowError(true)
      return
    }

    await onConfirm()
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose()
    }
  }

  const handleInputChange = (e) => {
    setConfirmationText(e.target.value)
    if (showError) {
      setShowError(false)
    }
  }

  if (!isOpen) return null

  const isNameMatch = confirmationText === accountName

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="glass-panel w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light text-white">Delete Account</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
            disabled={isLoading}
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Warning Message */}
        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-400 mb-1">This action cannot be undone</h3>
              <p className="text-xs text-white/70 leading-relaxed">
                Deleting this account will permanently remove:
              </p>
              <ul className="mt-2 text-xs text-white/60 space-y-1 list-disc list-inside">
                <li>The account and all its details</li>
                <li>All documents created for this account</li>
                <li>All reference files uploaded to this account</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Confirmation Input */}
          <div>
            <label htmlFor="confirm-name" className="block text-sm font-light text-white/80 mb-2">
              Type <span className="font-medium text-cyan-400">{accountName}</span> to confirm deletion
            </label>
            <input
              id="confirm-name"
              type="text"
              value={confirmationText}
              onChange={handleInputChange}
              placeholder="Type account name here..."
              className={`w-full px-4 py-3 rounded-lg bg-white/10 border text-white 
                       placeholder-white/40 focus:outline-none transition-all
                       ${showError 
                         ? 'border-red-500/50 focus:border-red-500/70 bg-red-500/5' 
                         : isNameMatch
                         ? 'border-emerald-500/50 focus:border-emerald-500/70 bg-emerald-500/5'
                         : 'border-white/20 focus:bg-white/15 focus:border-cyan-400/50'
                       }`}
              disabled={isLoading}
              autoFocus
              autoComplete="off"
            />
            {showError && (
              <p className="mt-2 text-xs text-red-400">
                Account name doesn't match. Please type it exactly as shown above.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-white/20 text-white/80 
                       hover:bg-white/10 transition-all font-light"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-red-600/80 hover:bg-red-600 
                       text-white font-light transition-all inline-flex items-center space-x-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!isNameMatch || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete Account</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}

export default AccountDeletionModal 