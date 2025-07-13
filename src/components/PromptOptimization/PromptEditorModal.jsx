import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import TestResultsPanel from './TestResultsPanel';

const AVAILABLE_VARIABLES = [
  { name: 'client_name', description: 'The name of the client/prospect' },
  { name: 'document_type', description: 'Type of document being generated' },
  { name: 'industry', description: 'Client industry sector' },
  { name: 'stage', description: 'Sales stage (evaluation, negotiation, etc.)' },
  { name: 'value', description: 'Deal value or contract amount' }
];

function PromptEditorModal({ isOpen, onClose, step, onSave, optimizeImmediately = false, existingOptimizationResults = null, onSaveOptimizationResults }) {
  const [editedPrompt, setEditedPrompt] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [showOptimization, setShowOptimization] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationProgress, setOptimizationProgress] = useState('');
  const [optimizedVariants, setOptimizedVariants] = useState([]);

  useEffect(() => {
    if (step) {
      setEditedPrompt(step.currentPrompt);
      setHasChanges(false);
      
      // If we have existing optimization results, show them immediately
      if (existingOptimizationResults) {
        setOptimizedVariants(existingOptimizationResults);
        setShowOptimization(true);
        setIsOptimizing(false);
      } else {
        setOptimizedVariants([]);
        setShowOptimization(false);
      }
    }
  }, [step, existingOptimizationResults]);

  useEffect(() => {
    if (isOpen && step && optimizeImmediately && !existingOptimizationResults) {
      // Only trigger optimization if we don't have existing results
      handleOptimizePrompt();
    }
  }, [isOpen, step, optimizeImmediately, existingOptimizationResults]);

  if (!isOpen || !step) return null;

  const handleSave = () => {
    onSave(step.id, editedPrompt);
    setHasChanges(false);
    
    // Show success toast
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 glass-panel p-4 bg-emerald-500/20 border-emerald-500/30 z-50 animate-in fade-in slide-in-from-top duration-300';
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-white">Prompt saved successfully!</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
    
    onClose();
  };

  const handlePromptChange = (e) => {
    setEditedPrompt(e.target.value);
    setHasChanges(e.target.value !== step.currentPrompt);
  };

  const handleTestPrompt = () => {
    setShowTestPanel(true);
  };

  const handleOptimizePrompt = async () => {
    setIsOptimizing(true);
    setOptimizationProgress('Analyzing prompt structure...');

    // Simulate optimization steps
    await new Promise(resolve => setTimeout(resolve, 1000));
    setOptimizationProgress('Generating optimization variants...');
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setOptimizationProgress('Scoring and ranking results...');
    
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate mock variants
    const variants = [
      {
        prompt: editedPrompt + "\n\nRemember: Focus on clarity, actionability, and measurable outcomes. Use specific examples where possible.",
        score: 92,
        improvements: ["Added focus on outcomes", "Emphasized clarity", "Included example guidance"]
      },
      {
        prompt: editedPrompt.replace("Your approach:", "Your approach (using chain-of-thought reasoning):") + "\n\nAlways quantify benefits and address potential objections proactively.",
        score: 88,
        improvements: ["Enhanced reasoning approach", "Added quantification reminder", "Proactive objection handling"]
      },
      {
        prompt: editedPrompt + "\n\nContext: Adapt your tone based on {{stage}} - education for early stages, urgency for decision phase.\n\nPrioritize: Business value over technical details.",
        score: 85,
        improvements: ["Dynamic tone adjustment", "Stage-aware content", "Business-first approach"]
      }
    ];

    setOptimizedVariants(variants);
    setIsOptimizing(false);
    setShowOptimization(true);
    
    // Save the optimization results to the parent component
    if (onSaveOptimizationResults) {
      onSaveOptimizationResults(step.id, variants);
    }
  };

  const handleApplyVariant = (variantPrompt) => {
    setEditedPrompt(variantPrompt);
    setHasChanges(true);
    setShowOptimization(false);
    setOptimizedVariants([]);
    
    // Show success notification
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 glass-panel p-4 bg-cyan-500/20 border-cyan-500/30 z-50 animate-in fade-in slide-in-from-top duration-300';
    toast.innerHTML = `
      <div class="flex items-center space-x-2">
        <span class="text-cyan-400">✨</span>
        <span class="text-white">Optimized variant applied!</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  // Highlight variables in the prompt
  const highlightVariables = (text) => {
    return text.replace(/\{\{(\w+)\}\}/g, (match, variable) => {
      return `<span class="text-cyan-400 font-mono">{{${variable}}}</span>`;
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-8"
      onClick={handleBackdropClick}
    >
      <div className="glass-panel w-full h-full max-w-[80vw] max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{step.icon}</span>
                <h2 className="text-2xl font-light text-white">Workflow Step: {step.name}</h2>
                <span className="text-sm text-cyan-400/70 bg-cyan-400/10 px-3 py-1 rounded-full">
                  {step.persona}
                </span>
              </div>
              <p className="text-white/60">{step.description}</p>
            </div>
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
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Show optimization results if available */}
          {showOptimization && optimizedVariants.length > 0 ? (
            <div className="w-full p-6 overflow-y-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-light text-white mb-2">Optimization Results</h2>
                <p className="text-white/60">Compare and select the best prompt variant</p>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Prompt */}
                <div className="glass-panel p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-light text-white">Current Prompt</h3>
                  </div>
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
                    <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono">
                      {step.currentPrompt}
                    </pre>
                  </div>
                  <div className="text-sm text-white/60">
                    <p>Baseline for comparison</p>
                  </div>
                </div>

                {/* Optimized Variants */}
                {optimizedVariants.map((variant, index) => (
                  <div key={index} className="glass-panel p-6 relative">
                    {/* Quality Badge */}
                    <div className="absolute top-4 right-4">
                      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
                        LLM-as-Judge Quality Score: {variant.score}%
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="text-lg font-light text-white">Variant {index + 1}</h3>
                    </div>

                    {/* Improvements */}
                    <div className="mb-4">
                      <p className="text-xs text-white/60 mb-2">Key Improvements:</p>
                      <ul className="space-y-1">
                        {variant.improvements.map((improvement, i) => (
                          <li key={i} className="text-sm text-cyan-400 flex items-center gap-2">
                            <span className="text-emerald-400">✓</span>
                            {improvement}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Prompt Text */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <pre className="text-sm text-white/80 whitespace-pre-wrap font-mono">
                        {variant.prompt}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
              
            </div>
          ) : isOptimizing ? (
            <div className="w-full p-8 flex items-center justify-center">
              <div className="text-center animate-in fade-in zoom-in duration-200">
                <div className="text-6xl mb-4">⚙️</div>
                <h3 className="text-xl font-light text-white mb-2">Optimizing Your Prompt</h3>
                <p className="text-white/60 mb-6">{optimizationProgress}</p>
                
                {/* Progress Bar */}
                <div className="w-full max-w-md mx-auto bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse"
                       style={{ width: optimizationProgress.includes('Analyzing') ? '33%' : 
                                       optimizationProgress.includes('Generating') ? '66%' : '95%' }}>
                  </div>
                </div>
              </div>
            </div>
          ) : (
          <>
          {/* Editor Panel */}
          <div className={`${showTestPanel ? 'w-1/2' : 'w-full'} p-6 flex flex-col h-full`}>
            {/* Variable Hints */}
            <div className="mb-4 p-4 bg-white/5 rounded-lg border border-white/10">
              <h3 className="text-sm font-light text-white/80 mb-2">Available Variables:</h3>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_VARIABLES.map((variable) => (
                  <div
                    key={variable.name}
                    className="group relative"
                  >
                    <code className="text-xs bg-cyan-400/10 text-cyan-400 px-2 py-1 rounded cursor-help">
                      {`{{${variable.name}}}`}
                    </code>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-black/90 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {variable.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Prompt Editor */}
            <div className="flex-1 flex flex-col">
              <label className="text-sm font-light text-white/80 mb-2">Prompt Template:</label>
              <textarea
                value={editedPrompt}
                onChange={handlePromptChange}
                className="flex-1 w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white 
                         placeholder-white/40 hover:bg-white/15 focus:bg-white/15 
                         focus:border-cyan-400/50 focus:outline-none transition-all resize-none font-mono text-sm"
                placeholder="Enter your prompt template here..."
              />
              {hasChanges && (
                <p className="text-xs text-cyan-400 mt-2">* You have unsaved changes</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6">
              <div className="flex gap-3">
                <button
                  onClick={handleTestPrompt}
                  className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-400 transition-all duration-200"
                >
                  Test Prompt →
                </button>
                <button
                  onClick={handleOptimizePrompt}
                  disabled={isOptimizing}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-400 transition-all duration-200 flex items-center gap-2"
                >
                  <span>⚙️</span>
                  <span>{isOptimizing ? 'Optimizing...' : 'Optimize This Prompt'}</span>
                </button>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="btn-volcanic px-5 py-2.5 text-sm font-light"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!hasChanges}
                  className={`btn-volcanic-primary px-5 py-2.5 text-sm font-light ${!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          {/* Test Results Panel */}
          {showTestPanel && (
            <div className="w-1/2 border-l border-white/10 bg-white/5 relative h-full">
              <button
                onClick={() => setShowTestPanel(false)}
                className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors z-10"
                aria-label="Close test panel"
              >
                <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <TestResultsPanel 
                step={step}
                prompt={editedPrompt}
                isVisible={showTestPanel}
              />
            </div>
          )}
          </>
          )}
        </div>
      </div>


    </div>,
    document.body
  );
}

export default PromptEditorModal;