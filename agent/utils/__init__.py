"""
Utility modules for the enhanced document generation agent
"""
from .mermaid_generator import (
    detect_diagram_opportunity,
    validate_mermaid_syntax,
    extract_mermaid_from_content,
    MERMAID_TEMPLATES
)