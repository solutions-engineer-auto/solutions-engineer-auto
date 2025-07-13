import React, { useState, useEffect } from 'react';

const SAMPLE_DATA = {
  client_name: "TechCorp Industries",
  document_type: "Technical Architecture Proposal",
  industry: "Healthcare",
  stage: "Evaluation",
  value: "$2.5M"
};

// Mock generated outputs for different step types
const MOCK_OUTPUTS = {
  analyze: `Based on my analysis of TechCorp Industries' requirements:

**Key Business Drivers:**
- Digital transformation initiative in healthcare sector
- Need for HIPAA-compliant cloud infrastructure
- Current on-premise systems reaching end-of-life
- $2.5M budget allocated for modernization

**Technical Requirements:**
- Microservices architecture for scalability
- Real-time data processing capabilities
- Integration with existing EMR systems
- Zero-downtime deployment strategy

**Risks & Concerns:**
- Data migration complexity
- Staff training requirements
- Regulatory compliance during transition`,

  plan: `**Document Outline for Technical Architecture Proposal**

1. Executive Summary
   - Business impact and ROI
   - Key benefits for TechCorp Industries
   
2. Current State Assessment
   - Infrastructure limitations
   - Pain points analysis
   
3. Proposed Solution Architecture
   - Cloud-native design
   - Security framework
   - Integration approach
   
4. Implementation Roadmap
   - Phase 1: Foundation (Months 1-3)
   - Phase 2: Migration (Months 4-6)
   - Phase 3: Optimization (Months 7-9)
   
5. Investment & ROI Analysis
   - Total cost breakdown
   - 3-year ROI projection`,

  generate: `**Executive Summary**

TechCorp Industries stands at a critical juncture in its digital transformation journey. Our proposed cloud-native architecture will deliver a 40% reduction in operational costs while ensuring 100% HIPAA compliance and enabling real-time patient data access across your healthcare network.

This $2.5M investment will yield a projected ROI of 285% over three years, with break-even achieved in month 14. Our phased approach minimizes risk while delivering quick wins in Phase 1.`,

  validate: `**Quality Assessment Report**

✅ **Strengths:**
- Clear value proposition with quantified benefits
- Addresses all stated requirements
- Professional tone appropriate for executives
- Strong ROI justification

⚠️ **Areas for Enhancement:**
- Add specific competitor differentiators
- Include more healthcare industry examples
- Strengthen risk mitigation section

📊 **Quality Score: 88/100**`,

  assemble: `**Document Assembly Complete**

✅ All sections integrated successfully
✅ Consistent tone and messaging throughout
✅ Smooth transitions between sections
✅ Executive summary aligns with detailed content
✅ All client requirements addressed

**Final Document Stats:**
- Pages: 24
- Sections: 8
- Graphics: 5
- Estimated reading time: 12 minutes`,

  finalize: `**Final Polish Applied**

✅ Professional formatting applied
✅ Table of contents generated
✅ Page numbers added
✅ Headers and footers standardized
✅ All links verified
✅ Spell check completed
✅ Brand guidelines applied

**Document Status: Ready for Delivery**`
};

function TestResultsPanel({ step, prompt, isVisible }) {
  const [isLoading, setIsLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    if (isVisible && step && prompt) {
      runTest();
    }
  }, [isVisible, step, prompt]);

  const runTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    setMetrics(null);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Process the prompt with sample data
    let processedPrompt = prompt;
    Object.entries(SAMPLE_DATA).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      processedPrompt = processedPrompt.replace(regex, value);
    });

    // Get mock output based on step type
    const output = MOCK_OUTPUTS[step.id] || 'Generated output would appear here...';

    // Calculate metrics
    const wordCount = output.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200); // 200 words per minute
    const completenessScore = Math.floor(Math.random() * 20) + 80; // 80-100
    
    // Analyze tone
    const tones = ['Professional', 'Technical', 'Executive-focused', 'Persuasive'];
    const tone = tones[Math.floor(Math.random() * tones.length)];

    setTestResult({
      processedPrompt,
      output
    });

    setMetrics({
      wordCount,
      readingTime,
      completenessScore,
      tone
    });

    setIsLoading(false);
  };

  if (!isVisible) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-white/10">
        <h3 className="text-lg font-light text-white mb-2">Test Results</h3>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/60">Test Data:</span>
          <code className="text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded text-xs">
            {SAMPLE_DATA.client_name} - {SAMPLE_DATA.document_type}
          </code>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500/30 border-t-cyan-500 mx-auto mb-4"></div>
              <p className="text-white/60">Running test with sample data...</p>
            </div>
          </div>
        ) : testResult ? (
          <div className="space-y-6">
            {/* Quality Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Word Count</div>
                <div className="text-2xl font-light text-white">{metrics.wordCount}</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Reading Time</div>
                <div className="text-2xl font-light text-white">{metrics.readingTime} min</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Quality Score</div>
                <div className="text-2xl font-light text-cyan-400">{metrics.completenessScore}%</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="text-xs text-white/60 mb-1">Tone</div>
                <div className="text-2xl font-light text-white">{metrics.tone}</div>
              </div>
            </div>

            {/* Processed Prompt */}
            <div>
              <h4 className="text-sm font-light text-white/80 mb-2">Processed Prompt (with sample data):</h4>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">
                  {testResult.processedPrompt}
                </pre>
              </div>
            </div>

            {/* Generated Output */}
            <div>
              <h4 className="text-sm font-light text-white/80 mb-2">Generated Output:</h4>
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="prose prose-invert prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-white/90">
                    {testResult.output}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Re-run Test Button */}
      <div className="p-4 border-t border-white/10">
        <button
          onClick={runTest}
          disabled={isLoading}
          className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-500/50 rounded-lg text-cyan-400 text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Testing...' : 'Re-run Test'}
        </button>
      </div>
    </div>
  );
}

export default TestResultsPanel;