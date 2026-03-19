import { useState, useEffect, useCallback } from 'react'
import './TableOfContents.css'

export default function TableOfContents({ contentRef }) {
  const [headings, setHeadings] = useState([])
  const [activeId, setActiveId] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  // Extract headings from article content
  useEffect(() => {
    if (!contentRef?.current) return

    const elements = contentRef.current.querySelectorAll('h2, h3')
    const items = Array.from(elements).map((el, index) => {
      // Ensure each heading has an id for linking
      if (!el.id) {
        el.id = `heading-${index}`
      }
      return {
        id: el.id,
        text: el.textContent,
        level: el.tagName === 'H2' ? 2 : 3,
      }
    })
    setHeadings(items)
  }, [contentRef])

  // Track active heading with IntersectionObserver
  useEffect(() => {
    if (!contentRef?.current || headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first heading that is intersecting
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)

        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    )

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings, contentRef])

  const handleClick = useCallback(
    (e, id) => {
      e.preventDefault()
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        setActiveId(id)
        setIsOpen(false)
      }
    },
    []
  )

  if (headings.length === 0) return null

  return (
    <>
      {/* Mobile floating button */}
      <button
        className="toc-mobile-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Table of Contents"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="4" x2="17" y2="4" />
          <line x1="5" y1="8" x2="17" y2="8" />
          <line x1="3" y1="12" x2="17" y2="12" />
          <line x1="5" y1="16" x2="17" y2="16" />
        </svg>
      </button>

      {/* Mobile drawer overlay */}
      {isOpen && (
        <div className="toc-overlay" onClick={() => setIsOpen(false)} />
      )}

      {/* TOC sidebar / drawer */}
      <nav className={`toc-sidebar ${isOpen ? 'toc-sidebar--open' : ''}`}>
        <div className="toc-header">
          <span className="toc-title">Table of Contents</span>
          <button
            className="toc-close-btn"
            onClick={() => setIsOpen(false)}
            aria-label="Close table of contents"
          >
            &times;
          </button>
        </div>
        <ul className="toc-list">
          {headings.map(({ id, text, level }) => (
            <li key={id} className={`toc-item toc-item--h${level}`}>
              <a
                href={`#${id}`}
                className={`toc-link ${activeId === id ? 'toc-link--active' : ''}`}
                onClick={(e) => handleClick(e, id)}
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  )
}
