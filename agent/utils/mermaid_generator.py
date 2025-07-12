"""
Mermaid diagram generation utilities for the document generation agent
"""
from typing import Dict, Any, Optional, List
import json


# Mermaid diagram templates and examples
MERMAID_TEMPLATES = {
    "flowchart": {
        "description": "Process flows, decision trees, workflows",
        "example": """flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process A]
    B -->|No| D[Process B]
    C --> E[End]
    D --> E""",
        "syntax_guide": "Use TD/LR for direction, shapes: [] rectangle, {} rhombus, (()) circle"
    },
    "sequence": {
        "description": "API interactions, system communications, user flows",
        "example": """sequenceDiagram
    participant User
    participant API
    participant Database
    User->>API: Request Data
    API->>Database: Query
    Database-->>API: Results
    API-->>User: Response""",
        "syntax_guide": "Use ->> for messages, -->> for responses, participant for actors"
    },
    "gantt": {
        "description": "Project timelines, implementation phases, schedules",
        "example": """gantt
    title Implementation Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Planning           :a1, 2024-01-01, 30d
    Development        :a2, after a1, 45d
    section Phase 2
    Testing            :a3, after a2, 20d
    Deployment         :a4, after a3, 10d""",
        "syntax_guide": "Use sections for phases, define tasks with IDs and durations"
    },
    "erDiagram": {
        "description": "Data models, database schemas, entity relationships",
        "example": """erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int orderNumber
        date orderDate
    }""",
        "syntax_guide": "Use ||--o{ for one-to-many, attributes in {} blocks"
    },
    "classDiagram": {
        "description": "System architecture, class structures, component relationships",
        "example": """classDiagram
    class PaymentProcessor {
        +processPayment()
        +validateCard()
        -encryptData()
    }
    class Order {
        +orderId: string
        +total: decimal
        +submit()
    }
    Order --> PaymentProcessor : uses""",
        "syntax_guide": "Use + for public, - for private, --> for relationships"
    },
    "stateDiagram": {
        "description": "State machines, status flows, lifecycle diagrams",
        "example": """stateDiagram-v2
    [*] --> Draft
    Draft --> InReview : Submit
    InReview --> Approved : Approve
    InReview --> Draft : Reject
    Approved --> Published : Publish
    Published --> [*]""",
        "syntax_guide": "Use [*] for start/end, --> for transitions with labels"
    },
    "pie": {
        "description": "Distribution, percentages, market share",
        "example": """pie title Cost Distribution
    "Infrastructure" : 35
    "Personnel" : 40
    "Marketing" : 15
    "Operations" : 10""",
        "syntax_guide": "Use title for chart name, \"label\" : value for segments"
    }
}


def detect_diagram_opportunity(content: str, section_type: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Detect if content would benefit from a diagram
    Returns diagram suggestion with type and rationale
    """
    # Keywords that suggest different diagram types
    diagram_indicators = {
        "flowchart": [
            "process", "workflow", "steps", "procedure", "flow",
            "decision", "if", "then", "algorithm", "logic"
        ],
        "sequence": [
            "api", "integration", "interaction", "communication",
            "request", "response", "message", "protocol", "handshake"
        ],
        "gantt": [
            "timeline", "schedule", "phase", "milestone", "duration",
            "implementation", "rollout", "deadline", "project plan"
        ],
        "erDiagram": [
            "data model", "database", "schema", "entity", "relationship",
            "table", "field", "foreign key", "data structure"
        ],
        "classDiagram": [
            "architecture", "component", "module", "system design",
            "class", "interface", "service", "microservice"
        ],
        "stateDiagram": [
            "state", "status", "lifecycle", "transition", "stage",
            "approval", "workflow state", "condition"
        ],
        "pie": [
            "distribution", "percentage", "breakdown", "allocation",
            "market share", "proportion", "split"
        ]
    }
    
    content_lower = content.lower()
    section_lower = section_type.lower()
    
    # Check for diagram opportunities
    for diagram_type, keywords in diagram_indicators.items():
        keyword_matches = sum(1 for keyword in keywords if keyword in content_lower or keyword in section_lower)
        
        if keyword_matches >= 2:  # At least 2 matching keywords
            return {
                "suggested_type": diagram_type,
                "confidence": min(keyword_matches * 0.25, 0.9),
                "rationale": f"Content contains {keyword_matches} indicators for {diagram_type}",
                "template": MERMAID_TEMPLATES[diagram_type]
            }
    
    # Special cases based on section type
    if "technical" in section_lower and "architecture" in section_lower:
        return {
            "suggested_type": "classDiagram",
            "confidence": 0.8,
            "rationale": "Technical architecture sections benefit from visual component diagrams",
            "template": MERMAID_TEMPLATES["classDiagram"]
        }
    
    if "implementation" in section_lower or "timeline" in section_lower:
        return {
            "suggested_type": "gantt",
            "confidence": 0.8,
            "rationale": "Implementation sections benefit from timeline visualizations",
            "template": MERMAID_TEMPLATES["gantt"]
        }
    
    return None


def get_mermaid_prompt_enhancement(diagram_type: str, context: Dict[str, Any]) -> str:
    """
    Get prompt enhancement for generating specific mermaid diagram types
    """
    template = MERMAID_TEMPLATES.get(diagram_type, {})
    
    print(f"[MermaidGenerator] Creating enhancement for {diagram_type} diagram")
    print(f"[MermaidGenerator] Context keys: {list(context.keys())}")
    
    enhancement = f"""

When appropriate in this section, include a Mermaid diagram to visualize complex concepts.
Suggested diagram type: {diagram_type} - {template.get('description', '')}

Example syntax:
```mermaid
{template.get('example', '')}
```

Guidelines for {diagram_type} diagrams:
- {template.get('syntax_guide', '')}
- Keep diagrams focused and not overly complex
- Use clear, business-friendly labels
- Ensure the diagram directly supports the narrative
- Place diagrams after introducing the concept in text

Include diagrams when they:
1. Simplify complex relationships
2. Visualize processes or flows
3. Provide at-a-glance understanding
4. Replace lengthy textual descriptions

CRITICAL: Ensure Mermaid syntax is valid and follows the example structure.
IMPORTANT: Always use the markdown fence syntax with triple backticks and 'mermaid' language identifier.
DO NOT use placeholders like MERMAIDBLOCK0 or similar - use the actual mermaid code.
"""
    
    print(f"[MermaidGenerator] Enhancement created, length: {len(enhancement)} chars")
    
    return enhancement


def validate_mermaid_syntax(mermaid_code: str) -> Dict[str, Any]:
    """
    Basic validation of mermaid syntax
    Returns validation result with any errors found
    """
    # Remove markdown code fence if present
    code = mermaid_code.strip()
    if code.startswith("```mermaid"):
        code = code[10:]
    if code.endswith("```"):
        code = code[:-3]
    code = code.strip()
    
    errors = []
    warnings = []
    
    # Check for diagram type declaration
    diagram_types = ["flowchart", "sequenceDiagram", "gantt", "erDiagram", "classDiagram", "stateDiagram", "pie"]
    has_type = any(code.startswith(dt) for dt in diagram_types)
    
    if not has_type:
        errors.append("Missing diagram type declaration")
    
    # Basic syntax checks
    if not code:
        errors.append("Empty diagram content")
    
    # Check for common syntax errors
    if "```" in code:
        errors.append("Nested code fences detected")
    
    if code.count("{") != code.count("}"):
        errors.append("Mismatched curly braces")
    
    if code.count("[") != code.count("]"):
        errors.append("Mismatched square brackets")
    
    if code.count("(") != code.count(")"):
        errors.append("Mismatched parentheses")
    
    # Diagram-specific validation
    if code.startswith("flowchart"):
        if "-->" not in code:
            warnings.append("Flowchart missing arrow connections")
    
    if code.startswith("sequenceDiagram"):
        if "participant" not in code:
            warnings.append("Sequence diagram missing participant declarations")
    
    if code.startswith("gantt"):
        if "title" not in code:
            warnings.append("Gantt chart missing title")
    
    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
        "cleaned_code": code
    }


def extract_mermaid_from_content(content: str) -> List[Dict[str, Any]]:
    """
    Extract all mermaid diagrams from markdown content
    Returns list of diagram info with positions
    """
    import re
    
    # Pattern to match mermaid code blocks
    pattern = r'```mermaid\n(.*?)\n```'
    
    diagrams = []
    for match in re.finditer(pattern, content, re.DOTALL):
        diagram_code = match.group(1)
        validation = validate_mermaid_syntax(diagram_code)
        
        diagrams.append({
            "code": diagram_code,
            "start_pos": match.start(),
            "end_pos": match.end(),
            "validation": validation
        })
    
    return diagrams


def suggest_diagram_placement(section_content: str, diagram_type: str) -> str:
    """
    Suggest where to place a diagram within section content
    Returns enhanced content with diagram placement marker
    """
    # Simple heuristic: place after first paragraph that introduces the concept
    paragraphs = section_content.split('\n\n')
    
    if len(paragraphs) <= 1:
        return section_content + "\n\n[DIAGRAM_PLACEHOLDER]"
    
    # Look for the best placement based on content
    best_position = 1  # Default after first paragraph
    
    for i, para in enumerate(paragraphs):
        # Place after paragraph that mentions key concepts
        if any(keyword in para.lower() for keyword in ["process", "flow", "steps", "architecture", "timeline"]):
            best_position = i + 1
            break
    
    # Insert placeholder
    paragraphs.insert(best_position, "[DIAGRAM_PLACEHOLDER]")
    return '\n\n'.join(paragraphs)