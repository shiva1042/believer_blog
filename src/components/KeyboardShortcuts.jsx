import { useState, useEffect } from 'react'
import './KeyboardShortcuts.css'

const SHORTCUTS = [
  { keys: ['\u2190', '\u2192'], description: 'Navigate between articles' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
  { keys: ['d'], description: 'Toggle dark mode' },
  { keys: ['s'], description: 'Open search' },
  { keys: ['p'], description: 'Go to practice' },
  { keys: ['h'], description: 'Go to home' },
  { keys: ['/'], description: 'Focus search box' },
  { keys: ['Esc'], description: 'Close modal' },
]

export default function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        if (e.key === 'Escape' && open) {
          setOpen(false)
        }
        return
      }

      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setOpen((prev) => !prev)
      } else if (e.key === 'Escape') {
        setOpen(false)
      } else if (e.key === 'd' && !e.ctrlKey && !e.metaKey) {
        const current = document.documentElement.getAttribute('data-theme')
        const next = current === 'dark' ? 'light' : 'dark'
        document.documentElement.setAttribute('data-theme', next)
        localStorage.setItem('theme', next)
      } else if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        window.location.href = '/search'
      } else if (e.key === 'p' && !e.ctrlKey && !e.metaKey) {
        window.location.href = '/practice'
      } else if (e.key === 'h' && !e.ctrlKey && !e.metaKey) {
        window.location.href = '/'
      } else if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        const searchInput = document.querySelector('.search-box input, .search-input')
        if (searchInput) searchInput.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div className="kbd-overlay" onClick={() => setOpen(false)}>
      <div className="kbd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kbd-header">
          <h2 className="kbd-title">Keyboard Shortcuts</h2>
          <button className="kbd-close" onClick={() => setOpen(false)} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="kbd-grid">
          {SHORTCUTS.map((s) => (
            <div key={s.description} className="kbd-row">
              <div className="kbd-keys">
                {s.keys.map((k) => (
                  <kbd key={k} className="kbd-key">{k}</kbd>
                ))}
              </div>
              <span className="kbd-desc">{s.description}</span>
            </div>
          ))}
        </div>
        <div className="kbd-footer">
          Press <kbd className="kbd-key">?</kbd> to toggle this dialog
        </div>
      </div>
    </div>
  )
}
