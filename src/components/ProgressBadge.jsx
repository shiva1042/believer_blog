import { useState } from 'react'
import { getProgress, setProgress, cycleStatus } from '../utils/progress.js'
import './ProgressBadge.css'

const STATUS_CONFIG = {
  'unmarked':        { label: 'Mark Progress', color: 'transparent' },
  'in-progress':     { label: 'In Progress',   color: '#f59e0b' },
  'completed':       { label: 'Completed',     color: '#22c55e' },
  'revision-needed': { label: 'Needs Revision', color: '#ef4444' },
}

export default function ProgressBadge({ slug }) {
  const [status, setStatus] = useState(() => getProgress(slug))

  function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    const next = cycleStatus(status)
    setProgress(slug, next)
    setStatus(next)
  }

  const config = STATUS_CONFIG[status]

  return (
    <button className={`progress-badge progress-badge--${status}`} onClick={handleClick} title="Click to cycle study status">
      <span className="progress-badge-dot" style={{ background: config.color }} />
      <span className="progress-badge-label">{config.label}</span>
    </button>
  )
}
