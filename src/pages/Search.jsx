import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { buildSearchIndex, searchArticles } from '../utils/searchIndex.js'
import { SECTIONS as ALL_SECTIONS } from '../utils/sections.js'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import './Search.css'

const SECTIONS = ['All', ...ALL_SECTIONS]

export default function Search() {
  useDocumentTitle('Search Articles')

  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [index, setIndex] = useState(null)
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('All')
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    buildSearchIndex()
      .then((idx) => {
        setIndex(idx)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const performSearch = useCallback(
    (q, idx, section) => {
      if (!idx) return
      const raw = searchArticles(idx, q)
      const filtered =
        section === 'All'
          ? raw
          : raw.filter((r) => r.section === section)
      setResults(filtered)
    },
    []
  )

  useEffect(() => {
    if (index && query) {
      performSearch(query, index, activeSection)
    }
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!index) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      if (query.trim()) {
        setSearchParams({ q: query }, { replace: true })
      } else {
        setSearchParams({}, { replace: true })
        setResults([])
        return
      }
      performSearch(query, index, activeSection)
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query, index, activeSection, performSearch, setSearchParams])

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const handleSectionChange = (section) => {
    setActiveSection(section)
  }

  return (
    <div className="search-page">
      <div className="search-page-header">
        <h1>Search Articles</h1>
        <div className="search-page-input-wrap">
          <svg className="search-page-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-page-input"
            placeholder="Search across all articles..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search-page-clear" onClick={() => setQuery('')} aria-label="Clear search">
              &times;
            </button>
          )}
        </div>

        <div className="search-section-filters">
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              className={`search-section-chip ${activeSection === sec ? 'active' : ''}`}
              onClick={() => handleSectionChange(sec)}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      <div className="search-page-results">
        {loading ? (
          <div className="search-state">
            <div className="search-spinner" />
            <p>Building search index...</p>
          </div>
        ) : !query.trim() ? (
          <div className="search-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <p>Search across all {index ? index.length : ''} articles...</p>
          </div>
        ) : results.length === 0 ? (
          <div className="search-state">
            <p>No articles found matching &ldquo;{query}&rdquo;. Try different keywords.</p>
          </div>
        ) : (
          <>
            <p className="search-result-count">
              Found {results.length} article{results.length !== 1 ? 's' : ''} matching &ldquo;{query}&rdquo;
            </p>
            <div className="search-result-list">
              {results.map((r) => (
                <div
                  key={r.slug}
                  className="search-result-card"
                  onClick={() => navigate(`/article/${r.slug}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/article/${r.slug}`)}
                >
                  <div className="search-result-top">
                    <h3 className="search-result-title">{r.title}</h3>
                    <span className="search-result-section">{r.section}</span>
                  </div>
                  <p className="search-result-desc">{r.description}</p>
                  {r.snippet && (
                    <p
                      className="search-result-snippet"
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                  <span className={`search-match-badge match-${r.matchType}`}>
                    {r.matchType} match
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
