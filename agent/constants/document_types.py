"""
Document Types for Solutions Engineering
Comprehensive list of document types that Solutions Engineers create
"""

DOCUMENT_TYPES = {
    # Pre-Sales Documents
    "solutions_brief": {
        "name": "Solutions Brief",
        "description": "Concise overview of how your solution addresses specific client challenges",
        "typical_audience": ["technical_evaluators", "business_decision_makers"],
        "typical_sections": ["Executive Summary", "Challenge Analysis", "Proposed Solution", "Key Benefits", "Next Steps"],
        "length": "2-4 pages"
    },
    "discovery_questionnaire": {
        "name": "Discovery Questionnaire", 
        "description": "Structured questions to understand client needs, environment, and requirements",
        "typical_audience": ["technical_contacts", "business_stakeholders"],
        "typical_sections": ["Business Objectives", "Technical Environment", "Current Challenges", "Success Criteria"],
        "length": "1-3 pages"
    },
    "solution_overview": {
        "name": "Solution Overview",
        "description": "High-level solution presentation for initial meetings and stakeholder alignment",
        "typical_audience": ["executives", "business_decision_makers", "technical_evaluators"],
        "typical_sections": ["Executive Summary", "Solution Overview", "Key Capabilities", "Business Value"],
        "length": "3-5 pages"
    },
    "competitive_comparison": {
        "name": "Competitive Comparison",
        "description": "Feature/capability comparison against competitors with differentiation points",
        "typical_audience": ["technical_evaluators", "procurement", "business_decision_makers"],
        "typical_sections": ["Comparison Matrix", "Key Differentiators", "Competitive Advantages", "Selection Criteria"],
        "length": "2-4 pages"
    },
    "roi_calculator": {
        "name": "ROI Calculator",
        "description": "Financial justification with ROI calculations and cost-benefit analysis",
        "typical_audience": ["financial_stakeholders", "business_decision_makers", "procurement"],
        "typical_sections": ["Investment Summary", "Cost Analysis", "Benefit Calculations", "ROI Projections"],
        "length": "2-3 pages"
    },
    "reference_architecture": {
        "name": "Reference Architecture",
        "description": "Technical blueprint showing how the solution fits within client infrastructure",
        "typical_audience": ["technical_evaluators", "architects", "it_teams"],
        "typical_sections": ["Current State Architecture", "Proposed Architecture", "Integration Points", "Technical Requirements"],
        "length": "4-8 pages"
    },

    # Sales Process Documents  
    "proposal": {
        "name": "Proposal",
        "description": "Comprehensive proposal document outlining solution, pricing, and terms",
        "typical_audience": ["all_stakeholders"],
        "typical_sections": ["Executive Summary", "Solution Description", "Implementation Plan", "Pricing", "Terms"],
        "length": "8-15 pages"
    },
    "rfp_response": {
        "name": "RFP Response",
        "description": "Structured response to Request for Proposal requirements",
        "typical_audience": ["evaluation_committee", "procurement", "technical_evaluators"],
        "typical_sections": ["Executive Summary", "Requirements Response", "Technical Approach", "Pricing", "Company Overview"],
        "length": "10-50 pages"
    },
    "demo_script": {
        "name": "Demo Script",
        "description": "Customized demo flow targeting specific prospect pain points and use cases",
        "typical_audience": ["internal_team", "sales_engineers"],
        "typical_sections": ["Demo Overview", "Key Messages", "Demo Flow", "Talking Points", "Q&A Preparation"],
        "length": "3-6 pages"
    },
    "pricing_proposal": {
        "name": "Pricing Proposal",
        "description": "Detailed pricing breakdown with options, terms, and commercial details",
        "typical_audience": ["procurement", "financial_stakeholders", "business_decision_makers"],
        "typical_sections": ["Pricing Summary", "Line Item Details", "Terms and Conditions", "Payment Schedule"],
        "length": "2-5 pages"
    },
    "statement_of_work": {
        "name": "Statement of Work",
        "description": "Project scope, timeline, deliverables, and responsibilities",
        "typical_audience": ["project_managers", "technical_teams", "business_stakeholders"],
        "typical_sections": ["Project Scope", "Deliverables", "Timeline", "Responsibilities", "Acceptance Criteria"],
        "length": "5-10 pages"
    },
    "security_questionnaire_response": {
        "name": "Security Questionnaire Response",
        "description": "Comprehensive answers to security, compliance, and risk management questions",
        "typical_audience": ["security_teams", "compliance_officers", "legal"],
        "typical_sections": ["Security Overview", "Compliance Certifications", "Data Protection", "Risk Management"],
        "length": "3-8 pages"
    },

    # Implementation Documents
    "poc_plan": {
        "name": "Proof of Concept Plan",
        "description": "Detailed plan for proof of concept including scope, timeline, and success criteria",
        "typical_audience": ["technical_teams", "project_managers", "business_stakeholders"],
        "typical_sections": ["POC Objectives", "Scope and Limitations", "Timeline", "Success Criteria", "Resource Requirements"],
        "length": "3-6 pages"
    },
    "implementation_plan": {
        "name": "Implementation Plan", 
        "description": "Step-by-step project execution plan with phases, milestones, and deliverables",
        "typical_audience": ["project_managers", "technical_teams", "business_stakeholders"],
        "typical_sections": ["Implementation Overview", "Project Phases", "Timeline", "Resource Requirements", "Risk Mitigation"],
        "length": "8-15 pages"
    },
    "technical_architecture": {
        "name": "Technical Architecture",
        "description": "Detailed technical design including system components, integrations, and specifications",
        "typical_audience": ["technical_evaluators", "architects", "development_teams"],
        "typical_sections": ["Architecture Overview", "System Components", "Integration Design", "Technical Specifications"],
        "length": "6-12 pages"
    },
    "deployment_guide": {
        "name": "Deployment Guide",
        "description": "Step-by-step instructions for system deployment and configuration",
        "typical_audience": ["technical_teams", "system_administrators"],
        "typical_sections": ["Prerequisites", "Installation Steps", "Configuration", "Validation", "Troubleshooting"],
        "length": "5-10 pages"
    },
    "testing_protocol": {
        "name": "Testing Protocol",
        "description": "Quality assurance procedures, test cases, and acceptance criteria",
        "typical_audience": ["qa_teams", "technical_teams", "business_stakeholders"],
        "typical_sections": ["Testing Overview", "Test Cases", "Acceptance Criteria", "Test Environment", "Results Documentation"],
        "length": "4-8 pages"
    },

    # Post-Sales Documents
    "business_case": {
        "name": "Business Case",
        "description": "Comprehensive justification for investment including costs, benefits, and strategic alignment",
        "typical_audience": ["executives", "financial_stakeholders", "business_decision_makers"],
        "typical_sections": ["Executive Summary", "Business Justification", "Financial Analysis", "Risk Assessment", "Implementation Plan"],
        "length": "6-10 pages"
    },
    "handoff_documentation": {
        "name": "Handoff Documentation",
        "description": "Transfer documentation from sales to implementation team",
        "typical_audience": ["implementation_teams", "project_managers", "account_managers"],
        "typical_sections": ["Client Overview", "Solution Summary", "Technical Requirements", "Key Contacts", "Project Timeline"],
        "length": "3-6 pages"
    },
    "training_materials": {
        "name": "Training Materials",
        "description": "User training guides, documentation, and educational content",
        "typical_audience": ["end_users", "administrators", "trainers"],
        "typical_sections": ["Training Overview", "User Guide", "Best Practices", "Common Scenarios", "Troubleshooting"],
        "length": "8-20 pages"
    },
    "success_metrics_report": {
        "name": "Success Metrics Report",
        "description": "Measurement and documentation of project outcomes and business value achieved",
        "typical_audience": ["business_stakeholders", "executives", "account_managers"],
        "typical_sections": ["Executive Summary", "Baseline Metrics", "Current Performance", "Value Delivered", "Recommendations"],
        "length": "4-8 pages"
    },
    "expansion_proposal": {
        "name": "Expansion Proposal",
        "description": "Proposal for additional modules, services, or expanded usage",
        "typical_audience": ["business_decision_makers", "account_managers", "technical_evaluators"],
        "typical_sections": ["Current State Assessment", "Expansion Opportunities", "Proposed Solution", "Business Impact", "Implementation Approach"],
        "length": "5-8 pages"
    },

    # Specialized Documents
    "integration_guide": {
        "name": "Integration Guide",
        "description": "Technical guide for integrating with existing systems and third-party applications",
        "typical_audience": ["technical_teams", "integration_specialists", "developers"],
        "typical_sections": ["Integration Overview", "Technical Requirements", "API Documentation", "Configuration Steps", "Testing"],
        "length": "6-12 pages"
    },
    "migration_plan": {
        "name": "Migration Plan",
        "description": "Plan for migrating data, configurations, or processes from legacy systems",
        "typical_audience": ["technical_teams", "project_managers", "business_stakeholders"],
        "typical_sections": ["Migration Overview", "Data Assessment", "Migration Strategy", "Timeline", "Risk Mitigation"],
        "length": "6-10 pages"
    },
    "custom": {
        "name": "Custom Document",
        "description": "Flexible document type for unique requirements not covered by standard types",
        "typical_audience": ["varies"],
        "typical_sections": ["varies_based_on_requirements"],
        "length": "varies"
    }
}

# Helper function to get document type options for prompts
def get_document_type_options():
    """Return formatted list of document types for LLM prompts"""
    return ", ".join([f"{key} ({doc['name']})" for key, doc in DOCUMENT_TYPES.items() if key != "custom"])

# Helper function to get document type info
def get_document_type_info(doc_type: str):
    """Get detailed information about a specific document type"""
    return DOCUMENT_TYPES.get(doc_type, DOCUMENT_TYPES["custom"])

# Categories for easier navigation
DOCUMENT_CATEGORIES = {
    "pre_sales": ["solutions_brief", "discovery_questionnaire", "solution_overview", "competitive_comparison", "roi_calculator", "reference_architecture"],
    "sales_process": ["proposal", "rfp_response", "demo_script", "pricing_proposal", "statement_of_work", "security_questionnaire_response"],
    "implementation": ["poc_plan", "implementation_plan", "technical_architecture", "deployment_guide", "testing_protocol"],
    "post_sales": ["business_case", "handoff_documentation", "training_materials", "success_metrics_report", "expansion_proposal"],
    "specialized": ["integration_guide", "migration_plan", "custom"]
}