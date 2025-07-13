import React from 'react';

function WorkflowSteps({ steps, onStepClick }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {steps.map((step, index) => (
        <div key={step.id} className="relative">
          {/* Workflow Arrow (except for last item) */}
          {index < steps.length - 1 && (
            <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 text-cyan-400/50 text-2xl z-10">
              {(index + 1) % 3 === 0 ? (
                // Down arrow at end of row
                <div className="absolute -right-6 top-6">↓</div>
              ) : (
                // Right arrow
                '→'
              )}
            </div>
          )}
          
          {/* Step Card */}
          <div 
            className="glass-panel glass-panel-hover p-6 cursor-pointer h-full flex flex-col"
            onClick={() => onStepClick(step.id)}
          >
            {/* Step Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{step.icon}</span>
                <div>
                  <h3 className="text-lg font-light text-white">{step.name}</h3>
                  <p className="text-xs text-cyan-400/70 uppercase tracking-wide">{step.persona}</p>
                </div>
              </div>
              <div className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
                Step {index + 1}
              </div>
            </div>
            
            {/* Description */}
            <p className="text-sm text-white/60 mb-4">{step.description}</p>
            
            {/* Prompt Preview */}
            <div className="flex-grow">
              <p className="text-xs text-white/40 mb-2">Current Prompt:</p>
              <p className="text-sm text-white/70 line-clamp-3">
                {step.currentPrompt}
              </p>
            </div>
            
            {/* Optimize Button */}
            <button className="mt-4 w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-400 text-sm transition-all duration-200">
              Optimize
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default WorkflowSteps;