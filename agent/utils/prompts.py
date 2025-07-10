"""
Enhanced prompt templates with role-based personas and prompt engineering best practices
"""

# Define specialist personas for each node
AGENT_PERSONAS = {
    "research_specialist": {
        "role": "Senior Research Analyst",
        "experience": "15 years of experience in enterprise document analysis and competitive intelligence",
        "expertise": "Identifying subtle connections between business requirements and existing documentation, pattern recognition across industries",
        "approach": "Look beyond surface-level matches to find deep insights that inform strategic recommendations",
        "traits": ["detail-oriented", "analytical", "pattern-focused"]
    },
    "business_analyst": {
        "role": "Principal Business Analyst",
        "experience": "Former CTO with 20 years translating complex business needs into actionable strategies",
        "expertise": "Business process optimization, technical architecture, executive communication",
        "approach": "Uncover unstated needs, identify underlying business drivers, anticipate implementation challenges",
        "traits": ["strategic", "empathetic", "solution-focused"]
    },
    "solutions_architect": {
        "role": "Senior Solutions Architect",
        "experience": "Designed 200+ winning proposals with 85% success rate",
        "expertise": "Document structure psychology, persuasive narrative flow, strategic positioning",
        "approach": "Create compelling narratives that guide readers from problem recognition to solution acceptance",
        "traits": ["strategic", "creative", "client-focused"]
    },
    "executive_writer": {
        "role": "Executive Communications Specialist",
        "experience": "Written for Fortune 500 C-suites and board presentations",
        "expertise": "Distilling complex initiatives into clear business value, creating urgency without pressure",
        "approach": "Lead with value, quantify impact, speak to strategic business outcomes",
        "traits": ["concise", "impact-focused", "persuasive"]
    },
    "technical_writer": {
        "role": "Principal Technical Writer",
        "experience": "Engineering background with 10 years making complex tech accessible",
        "expertise": "Technical accuracy, architectural diagrams, API documentation, security frameworks",
        "approach": "Balance technical depth with readability, use effective analogies and visualizations",
        "traits": ["precise", "clear", "educational"]
    },
    "business_value_writer": {
        "role": "Business Value Consultant",
        "experience": "McKinsey alumni specializing in ROI analysis and business case development",
        "expertise": "Financial modeling, cost-benefit analysis, risk assessment, value articulation",
        "approach": "Quantify everything possible, make conservative estimates, show clear value paths",
        "traits": ["analytical", "credible", "numbers-driven"]
    },
    "qa_director": {
        "role": "Quality Assurance Director",
        "experience": "Reviewed 1000+ enterprise documents, expert in compliance and editorial excellence",
        "expertise": "Consistency checking, fact verification, persuasive flow analysis, compliance validation",
        "approach": "Ensure technical accuracy, professional polish, and strategic compelling narrative",
        "traits": ["meticulous", "critical", "quality-obsessed"]
    }
}


def get_reasoning_steps(task_type: str) -> str:
    """Get chain-of-thought reasoning steps for different tasks"""
    
    reasoning_templates = {
        "analysis": """
Before providing your analysis, think through:
1. What are the client's explicitly stated needs?
2. What implicit needs or concerns can I infer from their situation?
3. What industry-specific challenges are they likely facing?
4. What risks or objections might they have?
5. How can our solution uniquely address these needs?

Now, based on this reasoning:""",
        
        "planning": """
Before creating the outline, consider:
1. What is the client's decision-making process?
2. Who are all the stakeholders who will read this?
3. What information do they need at each stage?
4. What concerns need to be addressed proactively?
5. How can we build trust and credibility progressively?

Based on this analysis:""",
        
        "generation": """
Before writing this section, think about:
1. What key message must this section convey?
2. How does it connect to previous sections?
3. What evidence or examples will resonate most?
4. What objections might arise here?
5. How can I make this memorable and actionable?

Now write the section:""",
        
        "validation": """
Before validating, consider:
1. Does this document achieve its primary objective?
2. Is the narrative flow logical and compelling?
3. Are all claims supported with evidence?
4. Is the tone appropriate for all stakeholders?
5. What would make this document even stronger?

Evaluate based on these criteria:"""
    }
    
    return reasoning_templates.get(task_type, "")


def get_context_adjustments(context: dict) -> str:
    """Get context-specific prompt adjustments"""
    
    adjustments = []
    
    # Stage-based adjustments
    stage = context.get("stage", "").lower()
    if "evaluation" in stage or "research" in stage:
        adjustments.append("Focus on education and trust-building. Avoid assuming they've made a decision.")
    elif "negotiation" in stage or "decision" in stage:
        adjustments.append("Emphasize differentiators and concrete ROI. They're comparing options.")
    elif "implementation" in stage:
        adjustments.append("Focus on execution details and success criteria. They've committed.")
    
    # Value-based adjustments
    value = context.get("value", "")
    if value and ("$" in value or "€" in value or "£" in value):
        try:
            # Extract numeric value
            import re
            numeric_value = int(re.sub(r'[^\d]', '', value))
            if numeric_value > 1000000:
                adjustments.append("This is a high-value opportunity. Emphasize risk mitigation and proven track record.")
            elif numeric_value < 50000:
                adjustments.append("Be conscious of budget constraints. Show phased approach options.")
        except:
            pass
    
    # Industry adjustments (if available in metadata)
    industry_hints = {
        "healthcare": "Use HIPAA-conscious language, emphasize security and patient data protection",
        "finance": "Focus on compliance (SOX, PCI-DSS), risk management, and audit trails",
        "retail": "Emphasize customer experience, omnichannel capabilities, and time-to-market",
        "manufacturing": "Focus on efficiency gains, supply chain integration, and reliability",
        "government": "Emphasize security clearances, compliance frameworks, and past federal work"
    }
    
    # Try to detect industry from company name or context
    company_name = context.get("name", "").lower()
    for industry, hint in industry_hints.items():
        if industry in company_name or industry in str(context).lower():
            adjustments.append(hint)
            break
    
    return "\n".join(adjustments) if adjustments else ""


def get_section_prompt(section_type: str, context: dict) -> str:
    """Get specialized prompt for different section types with personas"""
    
    section_type_clean = section_type.lower().replace(" ", "_")
    
    # Determine which persona to use
    persona_mapping = {
        "executive_summary": "executive_writer",
        "technical": "technical_writer",
        "implementation": "technical_writer",
        "investment": "business_value_writer",
        "roi": "business_value_writer",
        "introduction": "executive_writer",
        "conclusion": "executive_writer",
        "next_steps": "executive_writer"
    }
    
    # Find matching persona
    persona_key = "executive_writer"  # default
    for key, persona in persona_mapping.items():
        if key in section_type_clean:
            persona_key = persona
            break
    
    persona = AGENT_PERSONAS[persona_key]
    
    # Build persona-enhanced prompt
    enhanced_prompt = f"""You are a {persona['role']} with {persona['experience']}.
Your expertise: {persona['expertise']}
Your approach: {persona['approach']}

{get_reasoning_steps('generation')}
"""
    
    # Add specific section guidance
    section_prompts = {
        "executive_summary": """
Write a compelling executive summary that:
- Opens with the most impactful benefit or outcome (quantified if possible)
- Addresses the reader's primary business challenge in the first paragraph
- Presents 3-4 key value propositions with specific metrics
- Includes a risk mitigation statement to build confidence
- Ends with a clear, action-oriented next step
- Uses power words that resonate with executives (transform, accelerate, optimize)
        """,
        
        "technical_solution": """
Describe the technical solution with:
- Architecture overview using clear diagrams or descriptions
- Technology choices with business justification (not just technical reasons)
- Integration approach that minimizes disruption
- Security measures that exceed industry standards
- Scalability path that aligns with client growth projections
- Performance benchmarks compared to current state
        """,
        
        "implementation_approach": """
Outline the implementation approach including:
- Phased delivery plan with quick wins in Phase 1
- Detailed milestone mapping with success criteria
- Risk mitigation strategies with contingency plans
- Resource requirements and knowledge transfer plan
- Parallel work streams to accelerate delivery
- Change management approach to ensure adoption
        """,
        
        "investment_roi": """
Present the investment and ROI analysis:
- Executive-level cost summary with payment flexibility
- ROI timeline with conservative and optimistic scenarios
- Cost savings breakdown by category and timeline
- Revenue opportunity quantification
- Total Cost of Ownership (TCO) comparison
- Financing options and phased investment approach
        """
    }
    
    specific_guidance = section_prompts.get(section_type_clean, 
        "Focus on clarity, relevance to client needs, and actionable insights.")
    
    return enhanced_prompt + "\n" + specific_guidance


def get_validation_criteria(document_type: str) -> dict:
    """Get enhanced validation criteria for different document types"""
    
    criteria = {
        "proposal": {
            "required_elements": [
                "Clear value proposition with quantified benefits",
                "Specific solution details addressing all requirements",
                "Realistic timeline with buffer for contingencies",
                "Transparent pricing with no hidden costs",
                "Concrete next steps with owner and timeline"
            ],
            "quality_checks": [
                "Professional tone that matches client culture",
                "Client-specific content (not generic boilerplate)",
                "Quantifiable benefits with credible sources",
                "Clear differentiators from competitors",
                "Risk acknowledgment with mitigation strategies",
                "Social proof through relevant case studies"
            ]
        },
        "rfp_response": {
            "required_elements": [
                "Direct response to every RFP requirement",
                "Company qualifications matching requirements",
                "Detailed technical approach with alternatives",
                "Named project team with relevant experience",
                "Similar project references with outcomes",
                "Compliance matrix showing requirement coverage"
            ],
            "quality_checks": [
                "Strict compliance with RFP format and guidelines",
                "Evidence of capability through past successes",
                "Competitive differentiators clearly articulated",
                "Pricing transparency and value justification",
                "Risk mitigation specific to this project"
            ]
        },
        "technical_architecture": {
            "required_elements": [
                "Current state assessment with gap analysis",
                "Future state architecture with clear benefits",
                "Technology stack justification",
                "Integration points and data flows",
                "Security architecture and compliance",
                "Migration strategy with rollback plans"
            ],
            "quality_checks": [
                "Technical accuracy and industry best practices",
                "Scalability considerations documented",
                "Performance metrics and SLAs defined",
                "Disaster recovery and business continuity",
                "Clear diagrams and visualizations"
            ]
        }
    }
    
    return criteria.get(document_type, criteria["proposal"])


def get_few_shot_examples(task_type: str) -> str:
    """Provide few-shot examples for better outputs"""
    
    examples = {
        "requirement_extraction": """
Example of excellent requirement extraction:
Input: "We need better reporting"
Analysis: Client requires:
1. Real-time analytics dashboards with role-based access
2. Automated report generation and distribution
3. Integration with existing BI tools (likely Tableau/PowerBI based on their industry)
4. Mobile access for executives
5. Historical data migration and trend analysis
Success metrics: 50% reduction in report preparation time, 100% executive adoption within 30 days
""",
        
        "value_proposition": """
Example of compelling value proposition:
Weak: "Our solution will improve your operations"
Strong: "Our solution will reduce operational costs by 32% ($2.4M annually) while improving customer satisfaction scores by 15 points, based on similar implementations at TechCorp and FinanceInc"
""",
        
        "risk_mitigation": """
Example of effective risk acknowledgment:
"We recognize that data migration poses the highest project risk. Our mitigation approach includes:
1. Parallel run period with rollback capability
2. Incremental migration with validation checkpoints
3. Dedicated data quality team
4. $500K contingency budget for data cleansing"
"""
    }
    
    return examples.get(task_type, "")


def enhance_prompt_with_persona(base_prompt: str, node_type: str, context: dict) -> str:
    """Enhance any prompt with appropriate persona and context"""
    
    # Map node types to personas
    node_persona_map = {
        "retrieval": "research_specialist",
        "analysis": "business_analyst",
        "planning": "solutions_architect",
        "generation": "executive_writer",  # default, overridden by section type
        "validation": "qa_director",
        "assembly": "executive_writer"
    }
    
    persona_key = node_persona_map.get(node_type, "business_analyst")
    persona = AGENT_PERSONAS[persona_key]
    
    # Build enhanced prompt
    enhanced = f"""You are a {persona['role']} with {persona['experience']}.
Your expertise: {persona['expertise']}
Your approach: {persona['approach']}

Context adjustments for this client:
{get_context_adjustments(context)}

{get_reasoning_steps(node_type)}

{base_prompt}

Remember: Your reputation is built on delivering exceptional quality that exceeds client expectations.
"""
    
    return enhanced