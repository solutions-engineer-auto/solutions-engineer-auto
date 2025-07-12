import { useState } from 'react'

const DIAGRAM_TYPES = [
  {
    id: 'flowchart',
    name: 'Flowchart',
    description: 'Process flows, decision trees, workflows',
    preview: `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]`,
    template: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]`
  },
  {
    id: 'sequence',
    name: 'Sequence Diagram',
    description: 'API interactions, system communications',
    preview: `sequenceDiagram
    A->>B: Request
    B-->>A: Response`,
    template: `sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System-->>User: Response`
  },
  {
    id: 'gantt',
    name: 'Gantt Chart',
    description: 'Project timelines, schedules',
    preview: `gantt
    Task1: 2024-01-01, 30d
    Task2: after Task1, 20d`,
    template: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1           :a1, 2024-01-01, 30d
    Task 2           :after a1, 20d
    section Phase 2
    Task 3           :2024-02-20, 15d`
  },
  {
    id: 'classDiagram',
    name: 'Class Diagram',
    description: 'System architecture, components',
    preview: `classDiagram
    ClassA --|> ClassB
    ClassA : +method()`,
    template: `classDiagram
    class Component {
        +property: string
        +method(): void
    }
    class Service {
        +connect(): boolean
    }
    Component --> Service : uses`
  },
  {
    id: 'stateDiagram',
    name: 'State Diagram',
    description: 'State machines, lifecycles',
    preview: `stateDiagram-v2
    [*] --> State1
    State1 --> [*]`,
    template: `stateDiagram-v2
    [*] --> State1
    State1 --> State2 : Event
    State2 --> [*]`
  },
  {
    id: 'pie',
    name: 'Pie Chart',
    description: 'Distribution, percentages',
    preview: `pie
    "A" : 40
    "B" : 60`,
    template: `pie title Distribution
    "Category A" : 30
    "Category B" : 45
    "Category C" : 25`
  },
  {
    id: 'erDiagram',
    name: 'ER Diagram',
    description: 'Database schemas, relationships',
    preview: `erDiagram
    A ||--o{ B : has`,
    template: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }`
  }
]

export default function MermaidInsertModal({ isOpen, onClose, onInsert }) {
  const [selectedType, setSelectedType] = useState('flowchart')
  const [customCode, setCustomCode] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  if (!isOpen) return null

  const handleInsert = () => {
    if (useCustom && customCode.trim()) {
      onInsert(customCode.trim())
    } else {
      const diagram = DIAGRAM_TYPES.find(d => d.id === selectedType)
      if (diagram) {
        onInsert(diagram.template)
      }
    }
    onClose()
    setCustomCode('')
    setUseCustom(false)
  }

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Insert Mermaid Diagram</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Template/Custom Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setUseCustom(false)}
              className={`px-4 py-2 rounded-lg transition-all ${
                !useCustom 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              }`}
            >
              Use Template
            </button>
            <button
              onClick={() => setUseCustom(true)}
              className={`px-4 py-2 rounded-lg transition-all ${
                useCustom 
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50' 
                  : 'bg-white/5 text-white/70 border border-white/10 hover:bg-white/10'
              }`}
            >
              Custom Code
            </button>
          </div>

          {!useCustom ? (
            /* Template Gallery */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DIAGRAM_TYPES.map((diagram) => (
                <div
                  key={diagram.id}
                  onClick={() => setSelectedType(diagram.id)}
                  className={`
                    relative p-4 rounded-lg border cursor-pointer transition-all
                    ${selectedType === diagram.id 
                      ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-500/20' 
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }
                  `}
                >
                  {/* Selected indicator */}
                  {selectedType === diagram.id && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-cyan-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  <h3 className="text-white font-medium mb-1">{diagram.name}</h3>
                  <p className="text-white/60 text-sm mb-3">{diagram.description}</p>
                  
                  {/* Mini preview */}
                  <div className="bg-black/30 rounded p-2 overflow-hidden">
                    <pre className="text-cyan-300 text-xs font-mono whitespace-pre-wrap break-all">
                      {diagram.preview}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Custom Code Editor */
            <div>
              <div className="mb-3">
                <label className="text-white/80 text-sm mb-2 block">
                  Enter your custom Mermaid diagram code:
                </label>
                <textarea
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value)}
                  placeholder="flowchart TD&#10;    A[Start] --> B[End]"
                  className="w-full h-64 px-4 py-3 bg-black/40 border border-white/20 rounded-lg text-white font-mono text-sm placeholder-white/30 focus:outline-none focus:border-cyan-500/50 resize-none"
                  autoFocus
                />
              </div>
              <div className="text-white/60 text-sm">
                <p>Tips:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Start with a diagram type: flowchart, sequenceDiagram, gantt, etc.</li>
                  <li>Use proper Mermaid syntax for your diagram type</li>
                  <li>Check the <a href="https://mermaid.js.org/syntax/examples.html" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Mermaid documentation</a> for help</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/20">
          <div className="flex justify-between items-center">
            <div className="text-white/60 text-sm">
              {!useCustom && selectedType && (
                <span>Selected: {DIAGRAM_TYPES.find(d => d.id === selectedType)?.name}</span>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-white/70 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInsert}
                disabled={useCustom && !customCode.trim()}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/30 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Insert Diagram
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}