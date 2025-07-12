/**
 * Mermaid diagram helpers for better error handling and suggestions
 */

// Common mermaid syntax patterns
const DIAGRAM_TYPES = {
  flowchart: /^(flowchart|graph)\s+(TD|TB|BT|RL|LR)/,
  sequence: /^sequenceDiagram/,
  gantt: /^gantt/,
  classDiagram: /^classDiagram/,
  stateDiagram: /^stateDiagram(-v2)?/,
  pie: /^pie(\s+title)?/,
  erDiagram: /^erDiagram/,
  journey: /^journey/,
  gitGraph: /^gitGraph/,
  mindmap: /^mindmap/,
  timeline: /^timeline/
}

// Parse error messages and provide helpful suggestions
export function parseError(error, content) {
  const errorStr = error.toString()
  const lines = content.split('\n')
  
  // Check if diagram type is missing
  const hasDiagramType = Object.values(DIAGRAM_TYPES).some(regex => 
    regex.test(content.trim())
  )
  
  if (!hasDiagramType) {
    return {
      type: 'missing_type',
      message: 'Missing diagram type declaration',
      suggestion: 'Start with a diagram type like: flowchart TD, sequenceDiagram, gantt, etc.',
      example: 'flowchart TD\n    A[Start] --> B[End]'
    }
  }
  
  // Parse specific error types
  if (errorStr.includes('Parse error') || errorStr.includes('Syntax error')) {
    // Check for common syntax errors
    if (errorStr.includes('-->') || errorStr.includes('---')) {
      return {
        type: 'arrow_syntax',
        message: 'Invalid arrow syntax',
        suggestion: 'Check your arrow syntax. Common patterns:\n• Flowchart: -->, ---, -.-, ==>\n• Sequence: ->>, -->>, --, -x',
        line: findErrorLine(errorStr, lines)
      }
    }
    
    if (errorStr.includes('participant')) {
      return {
        type: 'sequence_error',
        message: 'Sequence diagram error',
        suggestion: 'Declare participants before using them:\nparticipant A\nparticipant B\nA->>B: Message'
      }
    }
    
    if (errorStr.includes('subgraph')) {
      return {
        type: 'subgraph_error',
        message: 'Subgraph syntax error',
        suggestion: 'Subgraphs must be properly closed:\nsubgraph Name\n  A --> B\nend'
      }
    }
  }
  
  // Check for unclosed brackets/quotes
  const openBrackets = (content.match(/\[/g) || []).length
  const closeBrackets = (content.match(/\]/g) || []).length
  if (openBrackets !== closeBrackets) {
    return {
      type: 'bracket_mismatch',
      message: 'Mismatched brackets',
      suggestion: `Found ${openBrackets} opening brackets [ but ${closeBrackets} closing brackets ]`,
      fix: 'Ensure all node labels are properly closed: A[Label]'
    }
  }
  
  const openQuotes = (content.match(/"/g) || []).length
  if (openQuotes % 2 !== 0) {
    return {
      type: 'quote_mismatch',
      message: 'Unclosed quote',
      suggestion: 'You have an odd number of quotes. Make sure all strings are properly quoted.'
    }
  }
  
  // Generic error fallback
  return {
    type: 'generic',
    message: 'Syntax error in diagram',
    suggestion: 'Check the Mermaid documentation for correct syntax',
    rawError: errorStr
  }
}

// Find the line number from error message
function findErrorLine(errorStr, lines) {
  const lineMatch = errorStr.match(/line (\d+)/i)
  if (lineMatch) {
    const lineNum = parseInt(lineMatch[1])
    return {
      number: lineNum,
      content: lines[lineNum - 1] || '',
      preview: lines.slice(Math.max(0, lineNum - 2), lineNum + 1).join('\n')
    }
  }
  return null
}

// Get syntax hints based on diagram type
export function getSyntaxHints(content) {
  const trimmed = content.trim()
  
  // Detect diagram type
  for (const [type, regex] of Object.entries(DIAGRAM_TYPES)) {
    if (regex.test(trimmed)) {
      return getDiagramHints(type)
    }
  }
  
  // No diagram type detected
  return {
    type: 'general',
    hints: [
      'Start with a diagram type (flowchart, sequenceDiagram, gantt, etc.)',
      'Example: flowchart TD for top-down flowchart',
      'Example: sequenceDiagram for message flows'
    ]
  }
}

// Get specific hints for each diagram type
function getDiagramHints(type) {
  const hints = {
    flowchart: {
      type: 'flowchart',
      hints: [
        'Node shapes: [rect], {rhombus}, ((circle)), ([stadium])',
        'Arrows: --> solid, --- line, -.-> dotted, ==> thick',
        'Labels: -->|text| or --text-->',
        'Subgraphs: subgraph Name ... end'
      ]
    },
    sequence: {
      type: 'sequence',
      hints: [
        'Define participants first: participant Alice',
        'Messages: ->> solid, -->> dashed, -x cancel',
        'Activation: activate/deactivate',
        'Notes: Note over Alice: text'
      ]
    },
    gantt: {
      type: 'gantt',
      hints: [
        'Set date format: dateFormat YYYY-MM-DD',
        'Add title: title Project Timeline',
        'Sections: section Phase Name',
        'Tasks: Task name :id, start-date, duration'
      ]
    },
    classDiagram: {
      type: 'classDiagram',
      hints: [
        'Class definition: class ClassName { }',
        'Properties: +public, -private, #protected',
        'Methods: +methodName()',
        'Relations: <|-- inherits, --> uses, --* composition'
      ]
    },
    stateDiagram: {
      type: 'stateDiagram',
      hints: [
        'States: State1 --> State2',
        'Start/End: [*] --> State, State --> [*]',
        'Transitions: State1 --> State2 : Event',
        'Composite: state State1 { ... }'
      ]
    },
    pie: {
      type: 'pie',
      hints: [
        'Title: pie title "Chart Title"',
        'Data: "Label" : value',
        'Simple format: "Label" : 25',
        'Values should add up to 100 for percentages'
      ]
    },
    erDiagram: {
      type: 'erDiagram',
      hints: [
        'Entities: ENTITY-NAME',
        'Relations: ||--o{ one-to-many, ||--|| one-to-one',
        'Attributes: ENTITY { type name }',
        'Common types: string, int, date, boolean'
      ]
    }
  }
  
  return hints[type] || hints.flowchart
}

// Validate diagram content and return issues
export function validateDiagram(content) {
  const issues = []
  
  if (!content.trim()) {
    issues.push({
      type: 'empty',
      severity: 'error',
      message: 'Diagram is empty'
    })
    return issues
  }
  
  // Check for diagram type
  const hasDiagramType = Object.values(DIAGRAM_TYPES).some(regex => 
    regex.test(content.trim())
  )
  
  if (!hasDiagramType) {
    issues.push({
      type: 'no_type',
      severity: 'error',
      message: 'Missing diagram type declaration',
      line: 1
    })
  }
  
  // Check for common issues
  const lines = content.split('\n')
  lines.forEach((line, index) => {
    // Check for tabs (mermaid prefers spaces)
    if (line.includes('\t')) {
      issues.push({
        type: 'tabs',
        severity: 'warning',
        message: 'Use spaces instead of tabs',
        line: index + 1
      })
    }
    
    // Check for trailing spaces
    if (line.endsWith(' ')) {
      issues.push({
        type: 'trailing_space',
        severity: 'warning',
        message: 'Trailing whitespace',
        line: index + 1
      })
    }
  })
  
  return issues
}