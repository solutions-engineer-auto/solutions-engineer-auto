import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function TemplateSelectionModal({ isOpen, onClose, templates, onConfirm }) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [documentTitle, setDocumentTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedTemplate('')
      setDocumentTitle('')
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
    if (!selectedTemplate || !documentTitle.trim()) return

    setIsSubmitting(true)
    try {
      const template = templates.find(t => t.id === selectedTemplate)
      await onConfirm(template, documentTitle.trim())
    } catch (error) {
      console.error('Error creating document from template:', error)
      setIsSubmitting(false)
    }
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="glass-panel w-full max-w-md p-6 relative animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light text-white">Create Document from Template</h2>
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
          {/* Template Selection */}
          <div>
            <label htmlFor="template-select" className="block text-sm font-light text-white/80 mb-2">
              Select Template
            </label>
            <div className="relative">
              <select
                id="template-select"
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                         appearance-none cursor-pointer hover:bg-white/15 focus:bg-white/15 
                         focus:border-cyan-400/50 focus:outline-none transition-all"
                required
              >
                <option value="" className="bg-[#0A0F1E]">Choose a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id} className="bg-[#0A0F1E]">
                    {template.file_name}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-5 h-5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Document Title */}
          <div>
            <label htmlFor="document-title" className="block text-sm font-light text-white/80 mb-2">
              Document Title
            </label>
            <input
              id="document-title"
              type="text"
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Enter document title..."
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                       placeholder-white/40 focus:bg-white/15 focus:border-cyan-400/50 
                       focus:outline-none transition-all"
              required
            />
          </div>

          {/* Template Preview (optional enhancement) */}
          {selectedTemplate && (
            <div className="p-3 rounded-lg bg-white/5 border border-white/10">
              <p className="text-xs text-white/60 font-light">
                Template: {templates.find(t => t.id === selectedTemplate)?.file_name}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-white/20 text-white/80 
                       hover:bg-white/10 transition-all font-light"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-volcanic-primary inline-flex items-center space-x-2"
              disabled={!selectedTemplate || !documentTitle.trim() || isSubmitting}
            >
              {isSubmitting ? (
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
                  <span>Create Document</span>
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

export default TemplateSelectionModal 