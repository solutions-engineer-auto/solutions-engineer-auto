import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import WorkflowSteps from '../components/PromptOptimization/WorkflowSteps';
import PromptEditorModal from '../components/PromptOptimization/PromptEditorModal';

// Initial workflow steps data
const INITIAL_WORKFLOW_STEPS = [
  {
    id: 'analyze',
    name: 'Analyze Context',
    icon: '🔍',
    persona: 'business_analyst',
    currentPrompt: 'You are a Principal Business Analyst with 20 years translating complex business needs into actionable strategies. Your expertise: Business process optimization, technical architecture, executive communication...',
    description: 'Understand client requirements and context'
  },
  {
    id: 'plan',
    name: 'Plan Document',
    icon: '📋',
    persona: 'solutions_architect',
    currentPrompt: 'You are a Senior Solutions Architect with experience designing 200+ winning proposals with 85% success rate. Your expertise: Document structure psychology, persuasive narrative flow, strategic positioning...',
    description: 'Create document structure and outline'
  },
  {
    id: 'generate',
    name: 'Generate Sections',
    icon: '✍️',
    persona: 'executive_writer',
    currentPrompt: 'You are an Executive Communications Specialist who has written for Fortune 500 C-suites and board presentations. Your expertise: Distilling complex initiatives into clear business value, creating urgency without pressure...',
    description: 'Write content for each section'
  },
  {
    id: 'validate',
    name: 'Validate Quality',
    icon: '✓',
    persona: 'qa_director',
    currentPrompt: 'You are a Quality Assurance Director who has reviewed 1000+ enterprise documents, expert in compliance and editorial excellence. Your expertise: Consistency checking, fact verification, persuasive flow analysis...',
    description: 'Ensure quality and completeness'
  },
  {
    id: 'assemble',
    name: 'Assemble Document',
    icon: '📦',
    persona: 'executive_writer',
    currentPrompt: 'You are an Executive Communications Specialist responsible for creating a cohesive, compelling final document. Your approach: Ensure smooth transitions, consistent tone, and powerful narrative arc...',
    description: 'Combine sections into final document'
  },
  {
    id: 'finalize',
    name: 'Finalize Document',
    icon: '🎯',
    persona: 'executive_writer',
    currentPrompt: 'You are finalizing this document for maximum impact. Focus on: Professional polish, strategic messaging alignment, call-to-action clarity, and ensuring all client requirements are addressed...',
    description: 'Final polish and formatting'
  }
];

function PromptOptimizationPage() {
  const navigate = useNavigate();
  const [selectedStep, setSelectedStep] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [workflowSteps, setWorkflowSteps] = useState(INITIAL_WORKFLOW_STEPS);
  const [optimizationResults, setOptimizationResults] = useState({}); // Store results by step ID

  const handleStepClick = (stepId) => {
    const step = workflowSteps.find(s => s.id === stepId);
    setSelectedStep(step);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedStep(null);
  };

  const handleSavePrompt = (stepId, newPrompt) => {
    // Update the prompt in local state
    setWorkflowSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, currentPrompt: newPrompt } : step
    ));
  };

  const handleSaveOptimizationResults = (stepId, variants) => {
    setOptimizationResults(prev => ({
      ...prev,
      [stepId]: variants
    }));
  };

  return (
    <div className="min-h-screen relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-red-900/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <Header
        actions={
          <>
            <button
              onClick={() => navigate('/accounts')}
              className="btn-volcanic flex items-center space-x-2 group"
            >
              <svg className="w-5 h-5 group-hover:text-cyan-500 transition-colors rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </>
        }
      >
        <div className="py-3">
          <h1 className="text-3xl font-light text-white tracking-wide">
            Prompt Optimization Lab
          </h1>
        </div>
        </Header>

        {/* Workflow Steps */}
        <div className="mb-8">
          <h3 className="text-lg font-light text-white mb-6">Document Generation Workflow</h3>
          <WorkflowSteps steps={workflowSteps} onStepClick={handleStepClick} />
        </div>
      </div>

      {/* Prompt Editor Modal */}
      <PromptEditorModal 
        isOpen={showModal}
        onClose={handleCloseModal}
        step={selectedStep}
        onSave={handleSavePrompt}
        optimizeImmediately={true}
        existingOptimizationResults={selectedStep ? optimizationResults[selectedStep.id] : null}
        onSaveOptimizationResults={handleSaveOptimizationResults}
      />
    </div>
  );
}

export default PromptOptimizationPage;