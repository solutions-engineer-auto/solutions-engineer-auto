import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function AccountCreationModal({ isOpen, onClose, onConfirm, isLoading = false }) {
  const [accountData, setAccountData] = useState({
    name: '',
    contact: '',
    value: '$0',
    stage: 'Discovery',
    description: ''
  })

  const stageOptions = ['Discovery', 'Pre-Sales', 'Pilot Deployment', 'Post-Sale']

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAccountData({
        name: '',
        contact: '',
        value: '$0',
        stage: 'Discovery',
        description: ''
      })
    }
  }, [isOpen])

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!accountData.name.trim()) return

    await onConfirm({
      ...accountData,
      name: accountData.name.trim(),
      contact: accountData.contact.trim() || 'Not specified',
      description: accountData.description.trim()
    })
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const updateField = (field, value) => {
    setAccountData(prev => ({ ...prev, [field]: value }))
  }

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="glass-panel w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light text-white">Create New Account</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Name */}
          <div>
            <label htmlFor="account-name" className="block text-sm font-light text-white/80 mb-2">
              Account Name *
            </label>
            <input
              id="account-name"
              type="text"
              value={accountData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Enter account name..."
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                       placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                       focus:outline-none transition-all"
              required
              autoFocus
            />
          </div>

          {/* Contact */}
          <div>
            <label htmlFor="account-contact" className="block text-sm font-light text-white/80 mb-2">
              Contact Person
            </label>
            <input
              id="account-contact"
              type="text"
              value={accountData.contact}
              onChange={(e) => updateField('contact', e.target.value)}
              placeholder="Enter contact name..."
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                       placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                       focus:outline-none transition-all"
            />
          </div>

          {/* Value and Stage Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Value */}
            <div>
              <label htmlFor="account-value" className="block text-sm font-light text-white/80 mb-2">
                Deal Value
              </label>
              <input
                id="account-value"
                type="text"
                value={accountData.value}
                onChange={(e) => updateField('value', e.target.value)}
                placeholder="$0"
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                         placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                         focus:outline-none transition-all"
              />
            </div>

            {/* Stage */}
            <div>
              <label htmlFor="account-stage" className="block text-sm font-light text-white/80 mb-2">
                Stage
              </label>
              <select
                id="account-stage"
                value={accountData.stage}
                onChange={(e) => updateField('stage', e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                         focus:bg-white/15 focus:border-cyan-400/50 focus:outline-none transition-all
                         cursor-pointer"
              >
                {stageOptions.map(stage => (
                  <option key={stage} value={stage} className="bg-gray-900">
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="account-description" className="block text-sm font-light text-white/80 mb-2">
              Description
            </label>
            <textarea
              id="account-description"
              value={accountData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Add any relevant details about this account..."
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                       placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                       focus:outline-none transition-all resize-none"
              rows="3"
            />
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
              className="btn-volcanic-primary inline-flex items-center space-x-2"
              disabled={!accountData.name.trim() || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create Account</span>
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

export default AccountCreationModal 