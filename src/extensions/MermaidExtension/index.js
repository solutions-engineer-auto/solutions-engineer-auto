/**
 * MermaidExtension - TipTap extension for Mermaid diagram support
 * 
 * This extension provides:
 * - Mermaid diagram rendering in the editor
 * - Interactive editing of diagrams
 * - Dark theme integration
 * - Markdown fence syntax support
 */

import { Extension } from '@tiptap/core'
import { MermaidNode } from './MermaidNode'

export const MermaidExtension = Extension.create({
  name: 'mermaidExtension',

  addOptions() {
    return {
      onError: undefined,
      theme: 'dark',
      securityLevel: 'loose',
    }
  },

  addExtensions() {
    // Include the MermaidNode as a sub-extension
    return [MermaidNode]
  },

  addStorage() {
    return {
      isInitialized: false,
    }
  },

  onCreate() {
    // Inject CSS styles for Mermaid diagrams
    if (!document.getElementById('mermaid-extension-styles')) {
      const style = document.createElement('style')
      style.id = 'mermaid-extension-styles'
      style.textContent = `
        /* Mermaid Extension Styles */
        .mermaid-node-wrapper {
          position: relative;
          margin: 1.5rem 0;
          border-radius: 0.5rem;
          background: rgba(30, 41, 59, 0.5);
          border: 1px solid rgba(71, 85, 105, 0.5);
          overflow: hidden;
          transition: all 0.2s ease;
        }
        
        .mermaid-node-wrapper.selected {
          border-color: #06b6d4;
          box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.2);
        }
        
        .mermaid-node-wrapper.editing {
          background: rgba(30, 41, 59, 0.8);
        }
        
        /* Display Mode */
        .mermaid-display {
          position: relative;
          cursor: pointer;
          min-height: 100px;
        }
        
        .mermaid-container {
          padding: 2rem;
          overflow: auto;
          max-width: 100%;
          text-align: center;
        }
        
        .mermaid-container svg {
          width: auto !important;
          max-width: 100%;
          height: auto !important;
          display: inline-block;
        }
        
        /* Loading State */
        .mermaid-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #94a3b8;
        }
        
        .spinner {
          width: 2rem;
          height: 2rem;
          border: 2px solid rgba(148, 163, 184, 0.3);
          border-top-color: #06b6d4;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-bottom: 1rem;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Error State */
        .mermaid-error {
          padding: 2rem;
          text-align: center;
          color: #f87171;
        }
        
        .error-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .error-message strong {
          display: block;
          margin-bottom: 0.5rem;
          color: #fbbf24;
        }
        
        .error-message p {
          color: #94a3b8;
          margin-bottom: 1rem;
          font-family: ui-monospace, monospace;
          font-size: 0.875rem;
        }
        
        .edit-button {
          padding: 0.5rem 1rem;
          background: #1e40af;
          color: white;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .edit-button:hover {
          background: #1e3a8a;
        }
        
        /* Controls */
        .mermaid-controls {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .mermaid-node-wrapper:hover .mermaid-controls,
        .mermaid-node-wrapper.selected .mermaid-controls {
          opacity: 1;
        }
        
        .mermaid-controls .edit-button {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          background: rgba(30, 41, 59, 0.9);
          color: #cbd5e1;
          border: 1px solid rgba(71, 85, 105, 0.5);
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .mermaid-controls .edit-button:hover {
          background: rgba(51, 65, 85, 0.9);
          border-color: rgba(100, 116, 139, 0.5);
          color: #e2e8f0;
        }
        
        /* Edit Mode */
        .mermaid-editor {
          display: flex;
          flex-direction: column;
          height: 100%;
          min-height: 500px;
        }
        
        .editor-content {
          flex: 1;
          display: flex;
          gap: 1px;
          background: rgba(71, 85, 105, 0.5);
          overflow: hidden;
        }
        
        .editor-pane,
        .preview-pane {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: rgba(15, 23, 42, 0.5);
        }
        
        .pane-header {
          padding: 0.75rem 1.5rem;
          background: rgba(30, 41, 59, 0.5);
          border-bottom: 1px solid rgba(71, 85, 105, 0.5);
          font-size: 0.875rem;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .editor-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: rgba(15, 23, 42, 0.5);
          border-bottom: 1px solid rgba(71, 85, 105, 0.5);
        }
        
        .editor-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #e2e8f0;
        }
        
        .editor-actions {
          display: flex;
          gap: 0.5rem;
        }
        
        .cancel-button,
        .save-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .cancel-button {
          background: rgba(71, 85, 105, 0.5);
          color: #cbd5e1;
        }
        
        .cancel-button:hover {
          background: rgba(71, 85, 105, 0.7);
        }
        
        .save-button {
          background: #06b6d4;
          color: white;
          font-weight: 500;
        }
        
        .save-button:hover {
          background: #0891b2;
        }
        
        .mermaid-textarea {
          flex: 1;
          padding: 1.5rem;
          background: transparent;
          border: none;
          color: #e2e8f0;
          font-family: ui-monospace, monospace;
          font-size: 0.875rem;
          line-height: 1.5;
          resize: none;
          outline: none;
        }
        
        .syntax-hint {
          padding: 0.75rem 1.5rem;
          background: rgba(6, 182, 212, 0.1);
          border-top: 1px solid rgba(6, 182, 212, 0.2);
          color: #06b6d4;
          font-size: 0.75rem;
        }
        
        /* Preview Pane */
        .preview-pane {
          position: relative;
        }
        
        .preview-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: auto;
          padding: 1.5rem;
        }
        
        .preview-content {
          max-width: 100%;
        }
        
        .preview-content svg {
          max-width: 100%;
          height: auto;
        }
        
        .preview-empty,
        .preview-error {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          text-align: center;
        }
        
        .preview-empty {
          color: #475569;
        }
        
        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }
        
        .preview-error {
          color: #f87171;
        }
        
        .preview-error .error-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        
        .preview-error h4 {
          color: #fbbf24;
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
        }
        
        .preview-error p {
          font-family: ui-monospace, monospace;
          font-size: 0.875rem;
        }
        
        .error-suggestion {
          margin: 0.5rem 0;
          color: #fde68a;
        }
        
        .error-example {
          background: rgba(0, 0, 0, 0.3);
          padding: 1rem;
          border-radius: 0.375rem;
          font-size: 0.75rem;
          color: #06b6d4;
          overflow-x: auto;
        }
        
        .error-line {
          margin-top: 1rem;
          padding: 0.5rem;
          background: rgba(248, 113, 113, 0.1);
          border-radius: 0.25rem;
          font-size: 0.875rem;
        }
        
        .error-line code {
          color: #fca5a5;
          font-family: ui-monospace, monospace;
        }
        
        /* Syntax Helper */
        .syntax-helper {
          padding: 1rem 1.5rem;
          background: rgba(15, 23, 42, 0.5);
          border-top: 1px solid rgba(71, 85, 105, 0.5);
          font-size: 0.75rem;
          max-height: 200px;
          overflow-y: auto;
        }
        
        .helper-section {
          margin-bottom: 1rem;
        }
        
        .helper-section:last-child {
          margin-bottom: 0;
        }
        
        .helper-section h5 {
          color: #94a3b8;
          margin: 0 0 0.5rem 0;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        
        .hint-list,
        .issue-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        
        .hint-list li {
          color: #cbd5e1;
          padding: 0.25rem 0;
          padding-left: 1rem;
          position: relative;
        }
        
        .hint-list li::before {
          content: "•";
          position: absolute;
          left: 0;
          color: #06b6d4;
        }
        
        .issue-list li {
          padding: 0.25rem 0.5rem;
          margin-bottom: 0.25rem;
          border-radius: 0.25rem;
        }
        
        .issue-error {
          background: rgba(239, 68, 68, 0.1);
          color: #fca5a5;
        }
        
        .issue-warning {
          background: rgba(245, 158, 11, 0.1);
          color: #fcd34d;
        }
        
        .issue-line {
          font-weight: 600;
        }
        
        .preview-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .spinner-small {
          width: 1.5rem;
          height: 1.5rem;
          border: 2px solid rgba(148, 163, 184, 0.3);
          border-top-color: #06b6d4;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        .mermaid-textarea::placeholder {
          color: #475569;
        }
        
        .editor-footer {
          padding: 1rem 1.5rem;
          background: rgba(15, 23, 42, 0.5);
          border-top: 1px solid rgba(71, 85, 105, 0.5);
          text-align: right;
        }
        
        .help-link {
          color: #06b6d4;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }
        
        .help-link:hover {
          color: #0891b2;
          text-decoration: underline;
        }
        
        /* Mermaid Diagram Overrides */
        .mermaid-container .node rect,
        .mermaid-container .node circle,
        .mermaid-container .node ellipse,
        .mermaid-container .node polygon,
        .mermaid-container .node path {
          stroke-width: 2px !important;
        }
        
        .mermaid-container .edgePath .path {
          stroke-width: 2px !important;
        }
        
        .mermaid-container .label {
          font-family: ui-sans-serif, system-ui, sans-serif !important;
        }
      `
      document.head.appendChild(style)
      console.log('[MermaidExtension] CSS styles injected')
    }

    this.storage.isInitialized = true
  },

  addCommands() {
    return {
      insertMermaidDiagram: (type = 'flowchart') => ({ commands }) => {
        const templates = {
          flowchart: `flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Process]
    B -->|No| D[End]`,
          
          sequence: `sequenceDiagram
    participant User
    participant System
    User->>System: Request
    System-->>User: Response`,
          
          gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1           :a1, 2024-01-01, 30d
    Task 2           :after a1, 20d
    section Phase 2
    Task 3           :2024-02-20, 15d`,
          
          classDiagram: `classDiagram
    class Component {
        +property: string
        +method(): void
    }
    class Service {
        +connect(): boolean
    }
    Component --> Service : uses`,
          
          stateDiagram: `stateDiagram-v2
    [*] --> State1
    State1 --> State2 : Event
    State2 --> [*]`,
          
          pie: `pie title Distribution
    "Category A" : 30
    "Category B" : 45
    "Category C" : 25`,
          
          erDiagram: `erDiagram
    CUSTOMER ||--o{ ORDER : places
    ORDER ||--|{ LINE-ITEM : contains
    CUSTOMER {
        string name
        string email
    }`,
        }

        const content = templates[type] || templates.flowchart
        return commands.insertContent({
          type: 'mermaid',
          attrs: { content },
        })
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-m': () => this.editor.commands.insertMermaidDiagram('flowchart'),
    }
  },
})

// Helper function to create the extension with options
export function createMermaidExtension(options = {}) {
  return MermaidExtension.configure(options)
}

// Export the node as well for direct access
export { MermaidNode } from './MermaidNode'