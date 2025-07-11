import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const AIEditModal = ({ isOpen, onClose, onSubmit, selectedText }) => {
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!instruction.trim()) return;
    
    setLoading(true);
    try {
      await onSubmit(instruction);
      setInstruction('');
      onClose();
    } catch (error) {
      console.error('Error submitting instruction:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && !loading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
      onKeyDown={handleKeyDown}
    >
      <div className="glass-panel p-6 max-w-lg w-full mx-4 animate-in fade-in zoom-in duration-200">
        <h2 className="text-2xl font-light text-white mb-4">AI Edit Instruction</h2>
        
        {selectedText && (
          <div className="mb-4">
            <p className="text-white/70 text-sm mb-2">Selected text:</p>
            <div className="bg-black/40 p-3 rounded-lg text-white/80 italic max-h-32 overflow-y-auto">
              "{selectedText}"
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="instruction" className="block text-white/70 text-sm mb-2">
              How would you like to modify this text?
            </label>
            <textarea
              ref={inputRef}
              id="instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full p-3 bg-black/40 text-white rounded-lg border border-white/10 focus:border-cyan-500/50 transition-colors outline-none resize-none"
              rows={3}
              placeholder="e.g., Make it more formal, fix grammar, add technical details..."
              disabled={loading}
            />
          </div>
          
          <div className="mb-4">
            <div className="text-xs text-white/50 space-y-1">
              <p className="font-medium text-white/70">💡 Tips for better results:</p>
              <p>• Be specific: "Make it more formal" vs "Make it better"</p>
              <p>• Try actionable verbs: "Simplify", "Expand", "Clarify", "Shorten"</p>
              <p>• Examples: "Fix grammar", "Add technical details", "Make it friendlier"</p>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn-volcanic"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-volcanic-primary disabled:opacity-50"
              disabled={!instruction.trim() || loading}
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></span>
                  Processing...
                </span>
              ) : (
                'Get AI Suggestions'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AIEditModal; 