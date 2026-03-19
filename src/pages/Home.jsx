import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SearchBox from '../components/SearchBox.jsx'
import ArticleCard from '../components/ArticleCard.jsx'
import { getLocalArticles } from '../utils/storage.js'
import { getAllProgress } from '../utils/progress.js'
import { getRevisionDue } from '../utils/spaced.js'
import StudyStreak from '../components/StudyStreak.jsx'
import { SECTIONS } from '../utils/sections.js'
import './Home.css'

const QUICK_LINKS = [
  { label: 'Formulas Cheat Sheet', icon: 'formula', section: 'Quick Revision' },
  { label: 'Exam Strategy', icon: 'strategy', section: 'GATE Essentials' },
  { label: 'Common Mistakes', icon: 'mistakes', section: 'GATE Essentials' },
]

export default function Home() {
  const [articles, setArticles] = useState([])
  const [search, setSearch] = useState('')
  const [activeSection, setActiveSection] = useState('All')
  const [expandedSections, setExpandedSections] = useState(new Set())
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/articles/articles.json')
      .then((res) => res.json())
      .then((staticArticles) => {
        const localArticles = getLocalArticles()
        const slugMap = new Map()
        staticArticles.forEach((a) => slugMap.set(a.slug, { ...a, source: 'static' }))
        localArticles.forEach((a) => slugMap.set(a.slug, { ...a, source: 'editor' }))
        const merged = Array.from(slugMap.values())
        merged.sort((a, b) => (a.section || '').localeCompare(b.section || '') || a.title.localeCompare(b.title))
        setArticles(merged)
      })
      .catch(() => {
        const localArticles = getLocalArticles()
        setArticles(localArticles)
      })
  }, [])

  const progress = useMemo(() => getAllProgress(), [])
  const revisionDue = useMemo(() => getRevisionDue(), [])

  // In-progress articles (last 5)
  const continueStudying = useMemo(() => {
    const inProgress = articles.filter((a) => progress[a.slug] === 'in-progress')
    return inProgress.slice(0, 5)
  }, [articles, progress])

  // Group articles by section
  const sectionGroups = useMemo(() => {
    const groups = {}
    articles.forEach((a) => {
      const sec = a.section || 'Uncategorized'
      if (!groups[sec]) groups[sec] = []
      groups[sec].push(a)
    })
    return groups
  }, [articles])

  // Section stats
  const sectionStats = useMemo(() => {
    const stats = {}
    for (const [sec, arts] of Object.entries(sectionGroups)) {
      const completed = arts.filter((a) => progress[a.slug] === 'completed').length
      stats[sec] = { total: arts.length, completed }
    }
    return stats
  }, [sectionGroups, progress])

  // Filter for search mode
  const filtered = useMemo(() => {
    if (!search) return null
    return articles.filter((a) => {
      return a.title.toLowerCase().includes(search.toLowerCase()) ||
        (a.description || '').toLowerCase().includes(search.toLowerCase())
    })
  }, [articles, search])

  // Filter by active section
  const sectionFiltered = useMemo(() => {
    if (activeSection === 'All') return null
    return articles.filter((a) => (a.section || '').includes(activeSection))
  }, [articles, activeSection])

  const toggleSection = (sec) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sec)) next.delete(sec)
      else next.add(sec)
      return next
    })
  }

  const handleRandomPractice = () => {
    if (articles.length === 0) return
    const idx = Math.floor(Math.random() * articles.length)
    navigate(`/article/${articles[idx].slug}`)
  }

  const totalCompleted = Object.values(progress).filter((v) => v === 'completed').length

  // Search mode: show flat grid
  if (search) {
    return (
      <div className="home">
        <div className="home-search-area">
          <SearchBox value={search} onChange={setSearch} />
          <Link to="/search" className="search-deep-link">Search inside articles &rarr;</Link>
        </div>
        {filtered && filtered.length === 0 ? (
          <p className="no-results">No articles found matching &ldquo;{search}&rdquo;</p>
        ) : (
          <>
            <p className="result-count">{filtered ? filtered.length : 0} result{filtered && filtered.length !== 1 ? 's' : ''}</p>
            <div className="article-grid">
              {filtered && filtered.map((article) => (
                <ArticleCard key={article.slug} {...article} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  // Section filter mode: show flat grid for that section
  if (activeSection !== 'All' && sectionFiltered) {
    return (
      <div className="home">
        <div className="home-search-area">
          <SearchBox value={search} onChange={setSearch} />
        </div>
        <div className="section-filter">
          <button
            className="section-btn"
            onClick={() => setActiveSection('All')}
          >
            &larr; All Sections
          </button>
          <span className="section-filter-active">{activeSection}</span>
        </div>
        {sectionFiltered.length === 0 ? (
          <p className="no-results">No articles in {activeSection}</p>
        ) : (
          <>
            <p className="result-count">{sectionFiltered.length} article{sectionFiltered.length !== 1 ? 's' : ''} in {activeSection}</p>
            <div className="article-grid">
              {sectionFiltered.map((article) => (
                <ArticleCard key={article.slug} {...article} />
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="home">
      {/* Hero Section */}
      <div className="home-hero">
        <h1 className="home-hero-title">GATE CS Knowledge Base</h1>
        <p className="home-hero-subtitle">
          {articles.length} articles, 300+ practice questions, 10 mock tests
        </p>
        <div className="home-hero-actions">
          <button className="hero-btn hero-btn-primary" onClick={() => {
            const firstSection = SECTIONS[0]
            setActiveSection(firstSection)
          }}>
            Start Studying
          </button>
          <button className="hero-btn hero-btn-secondary" onClick={handleRandomPractice}>
            Random Practice
          </button>
          <button className="hero-btn hero-btn-secondary" onClick={() => setActiveSection('Test Series')}>
            Mock Tests
          </button>
          <Link to="/progress" className="hero-btn hero-btn-secondary">
            Track Progress
          </Link>
        </div>
        <StudyStreak />
        {totalCompleted > 0 && (
          <div className="home-hero-progress">
            <div className="hero-progress-bar">
              <div
                className="hero-progress-fill"
                style={{ width: `${articles.length > 0 ? (totalCompleted / articles.length) * 100 : 0}%` }}
              />
            </div>
            <span className="hero-progress-text">{totalCompleted}/{articles.length} completed</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="home-search-area">
        <SearchBox value={search} onChange={setSearch} />
        <Link to="/search" className="search-deep-link">Search inside articles &rarr;</Link>
      </div>

      {/* Revision Due Alert */}
      {revisionDue.length > 0 && (
        <div className="home-revision-alert">
          <div className="revision-alert-content">
            <span className="revision-alert-icon">!</span>
            <span>{revisionDue.length} article{revisionDue.length !== 1 ? 's' : ''} due for revision</span>
          </div>
          <Link to="/progress" className="revision-alert-link">Review now &rarr;</Link>
        </div>
      )}

      {/* Continue Studying */}
      {continueStudying.length > 0 && (
        <div className="home-continue">
          <h2 className="home-section-heading">Continue Studying</h2>
          <div className="continue-row">
            {continueStudying.map((a) => (
              <Link key={a.slug} to={`/article/${a.slug}`} className="continue-card">
                <span className="continue-badge">In Progress</span>
                <span className="continue-title">{a.title}</span>
                <span className="continue-section">{a.section}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div className="home-quick-links">
        {QUICK_LINKS.map((ql) => (
          <button
            key={ql.label}
            className="quick-link-card"
            onClick={() => setActiveSection(ql.section)}
          >
            <span className="quick-link-icon">
              {ql.icon === 'formula' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>
              )}
              {ql.icon === 'strategy' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
              )}
              {ql.icon === 'mistakes' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></svg>
              )}
            </span>
            <span className="quick-link-label">{ql.label}</span>
          </button>
        ))}
      </div>

      {/* Section Filter Buttons */}
      <div className="section-filter">
        {SECTIONS.map((sec) => (
          <button
            key={sec}
            className="section-btn"
            onClick={() => setActiveSection(sec)}
          >
            {sec}
          </button>
        ))}
      </div>

      {/* Section Grid — collapsible groups */}
      <div className="home-sections-grid">
        {SECTIONS.map((sec) => {
          const stats = sectionStats[sec]
          if (!stats) return null
          const isExpanded = expandedSections.has(sec)
          const pct = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0

          return (
            <div key={sec} className={`home-section-card ${isExpanded ? 'expanded' : ''}`}>
              <button className="section-card-header" onClick={() => toggleSection(sec)}>
                <div className="section-card-info">
                  <h3 className="section-card-name">{sec}</h3>
                  <span className="section-card-count">
                    {stats.total} article{stats.total !== 1 ? 's' : ''}
                    {stats.completed > 0 && ` \u00B7 ${stats.completed} done`}
                  </span>
                </div>
                <div className="section-card-right">
                  <div className="section-card-bar">
                    <div className="section-card-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`section-card-chevron ${isExpanded ? 'open' : ''}`}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
              </button>
              {isExpanded && (
                <div className="section-card-articles">
                  <div className="article-grid">
                    {(sectionGroups[sec] || []).map((article) => (
                      <ArticleCard key={article.slug} {...article} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
