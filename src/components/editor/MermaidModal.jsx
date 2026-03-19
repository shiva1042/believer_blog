import { useState, useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import './MermaidModal.css'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

const TEMPLATES = {
  'Flowchart': `graph TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action 1]
    B -->|No| D[Action 2]
    C --> E[End]
    D --> E`,
  'Sequence': `sequenceDiagram
    participant A as Client
    participant B as Server
    A->>B: Request
    B-->>A: Response`,
  'Pie Chart': `pie title Distribution
    "Category A" : 40
    "Category B" : 35
    "Category C" : 25`,
  'State': `stateDiagram-v2
    [*] --> Idle
    Idle --> Processing : Start
    Processing --> Done : Complete
    Processing --> Error : Fail
    Error --> Idle : Retry
    Done --> [*]`,
  'Gantt': `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1 :a1, 2024-01-01, 30d
    Task 2 :after a1, 20d
    section Phase 2
    Task 3 :2024-02-20, 25d`,
  'Class': `classDiagram
    class Animal {
      +String name
      +int age
      +makeSound()
    }
    class Dog {
      +fetch()
    }
    Animal <|-- Dog`,
}

export default function MermaidModal({ onInsert, onClose }) {
  const [code, setCode] = useState(TEMPLATES['Flowchart'])
  const [error, setError] = useState('')
  const previewRef = useRef(null)

  useEffect(() => {
    renderPreview()
  }, [code])

  async function renderPreview() {
    if (!previewRef.current) return
    try {
      const { svg } = await mermaid.render('mermaid-preview', code)
      previewRef.current.innerHTML = svg
      setError('')
    } catch (e) {
      previewRef.current.innerHTML = ''
      setError(e.message || 'Invalid diagram syntax')
    }
  }

  function handleInsert() {
    if (error) return
    onInsert(`<div class="mermaid">\n${code}\n</div>`)
  }

  return (
    <div className="mermaid-modal-overlay" onClick={onClose}>
      <div className="mermaid-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mermaid-header">
          <span className="mermaid-title">Insert Mermaid Diagram</span>
          <button className="mermaid-close" onClick={onClose}>&times;</button>
        </div>

        <div className="mermaid-templates">
          {Object.keys(TEMPLATES).map((name) => (
            <button
              key={name}
              className="mermaid-tpl-btn"
              onClick={() => setCode(TEMPLATES[name])}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mermaid-body">
          <div className="mermaid-editor-pane">
            <label className="mermaid-label">Code</label>
            <textarea
              className="mermaid-textarea"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
            />
          </div>
          <div className="mermaid-preview-pane">
            <label className="mermaid-label">Preview</label>
            <div className="mermaid-preview" ref={previewRef} />
            {error && <div className="mermaid-error">{error}</div>}
          </div>
        </div>

        <div className="mermaid-footer">
          <button className="mermaid-btn cancel" onClick={onClose}>Cancel</button>
          <button className="mermaid-btn insert" onClick={handleInsert} disabled={!!error}>Insert Diagram</button>
        </div>
      </div>
    </div>
  )
}
