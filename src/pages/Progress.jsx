import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getAllProgress } from '../utils/progress.js'
import { getRevisionDue, markRevised, recordCompletion } from '../utils/spaced.js'
import DataManager from '../components/DataManager.jsx'
import Confetti from '../components/Confetti.jsx'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import './Progress.css'

const STATUS_COLORS = {
  'completed': '#22c55e',
  'in-progress': '#f59e0b',
  'revision-needed': '#ef4444',
}

const STATUS_LABELS = {
  'completed': 'Completed',
  'in-progress': 'In Progress',
  'revision-needed': 'Needs Revision',
}

export default function Progress() {
  useDocumentTitle('Study Progress')

  const [articles, setArticles] = useState([])
  const [progress, setProgress] = useState({})
  const [revisionDue, setRevisionDue] = useState([])

  const refreshRevision = useCallback(() => {
    setRevisionDue(getRevisionDue())
  }, [])

  useEffect(() => {
    fetch('/articles/articles.json')
      .then((r) => r.json())
      .then((arts) => {
        setArticles(arts)
        // Ensure completed articles are in spaced repetition
        const prog = getAllProgress()
        Object.entries(prog).forEach(([slug, status]) => {
          if (status === 'completed') {
            recordCompletion(slug)
          }
        })
        refreshRevision()
      })
      .catch(() => setArticles([]))
    setProgress(getAllProgress())
    refreshRevision()
  }, [refreshRevision])

  const handleMarkRevised = (slug) => {
    markRevised(slug)
    refreshRevision()
  }

  const total = articles.length
  const completed = articles.filter((a) => progress[a.slug] === 'completed').length
  const inProgress = articles.filter((a) => progress[a.slug] === 'in-progress').length
  const revisionNeeded = articles.filter((a) => progress[a.slug] === 'revision-needed').length
  const unmarked = total - completed - inProgress - revisionNeeded

  // Build a slug->title map for revision display
  const titleMap = {}
  articles.forEach((a) => { titleMap[a.slug] = a.title })

  // Group by section
  const sections = {}
  articles.forEach((a) => {
    if (!sections[a.section]) sections[a.section] = []
    sections[a.section].push(a)
  })

  // Track confetti trigger for completed sections
  const [confettiKey, setConfettiKey] = useState(0)
  const completedSections = useMemo(() => {
    const result = []
    for (const [sec, arts] of Object.entries(sections)) {
      const allDone = arts.length > 0 && arts.every((a) => progress[a.slug] === 'completed')
      if (allDone) result.push(sec)
    }
    return result
  }, [sections, progress])

  // Trigger confetti when a section first reaches 100%
  const [seenSections, setSeenSections] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('believer_blog_confetti_seen') || '[]')
    } catch { return [] }
  })

  useEffect(() => {
    const newlyCompleted = completedSections.filter((s) => !seenSections.includes(s))
    if (newlyCompleted.length > 0) {
      setConfettiKey((k) => k + 1)
      const updated = [...seenSections, ...newlyCompleted]
      setSeenSections(updated)
      localStorage.setItem('believer_blog_confetti_seen', JSON.stringify(updated))
    }
  }, [completedSections])

  const pct = (n) => (total > 0 ? ((n / total) * 100).toFixed(1) : 0)

  return (
    <div className="progress-page">
      <h1 className="progress-title">Study Progress</h1>
      <p className="progress-subtitle">Track your learning journey across all topics.</p>

      {/* Due for Revision Section */}
      {revisionDue.length > 0 && (
        <div className="revision-due-section">
          <div className="revision-due-header">
            <h2 className="revision-due-title">Due for Revision</h2>
            <span className="revision-due-count">
              {revisionDue.length} article{revisionDue.length !== 1 ? 's' : ''} due today
            </span>
          </div>
          <div className="revision-due-list">
            {revisionDue.map((item) => (
              <div key={item.slug} className="revision-due-item">
                <Link to={`/article/${item.slug}`} className="revision-due-link">
                  {titleMap[item.slug] || item.slug}
                </Link>
                <button
                  className="revision-due-btn"
                  onClick={() => handleMarkRevised(item.slug)}
                >
                  Mark Revised
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Stats */}
      <div className="progress-stats">
        <div className="stat-card stat-total">
          <span className="stat-number">{total}</span>
          <span className="stat-label">Total Articles</span>
        </div>
        <div className="stat-card stat-completed">
          <span className="stat-number">{completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card stat-in-progress">
          <span className="stat-number">{inProgress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card stat-revision">
          <span className="stat-number">{revisionNeeded}</span>
          <span className="stat-label">Needs Revision</span>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="progress-overall-bar-wrapper">
        <div className="progress-overall-bar">
          {completed > 0 && (
            <div className="bar-segment bar-completed" style={{ width: `${pct(completed)}%` }} title={`Completed: ${completed}`} />
          )}
          {inProgress > 0 && (
            <div className="bar-segment bar-in-progress" style={{ width: `${pct(inProgress)}%` }} title={`In Progress: ${inProgress}`} />
          )}
          {revisionNeeded > 0 && (
            <div className="bar-segment bar-revision" style={{ width: `${pct(revisionNeeded)}%` }} title={`Needs Revision: ${revisionNeeded}`} />
          )}
        </div>
        <div className="bar-legend">
          <span><span className="legend-dot" style={{ background: '#22c55e' }} /> Completed ({completed})</span>
          <span><span className="legend-dot" style={{ background: '#f59e0b' }} /> In Progress ({inProgress})</span>
          <span><span className="legend-dot" style={{ background: '#ef4444' }} /> Needs Revision ({revisionNeeded})</span>
          <span><span className="legend-dot" style={{ background: 'var(--color-border)' }} /> Unmarked ({unmarked})</span>
        </div>
      </div>

      {/* Per-section breakdown */}
      <div className="progress-sections">
        {Object.entries(sections).map(([section, arts]) => {
          const sCompleted = arts.filter((a) => progress[a.slug] === 'completed').length
          const sInProgress = arts.filter((a) => progress[a.slug] === 'in-progress').length
          const sRevision = arts.filter((a) => progress[a.slug] === 'revision-needed').length
          const sTotal = arts.length
          const sPct = (n) => (sTotal > 0 ? ((n / sTotal) * 100).toFixed(1) : 0)

          return (
            <div key={section} className="section-block">
              <div className="section-header">
                <h2 className="section-name">{section}</h2>
                <span className="section-count">{sCompleted}/{sTotal} completed</span>
              </div>
              <div className="section-bar">
                {sCompleted > 0 && <div className="bar-segment bar-completed" style={{ width: `${sPct(sCompleted)}%` }} />}
                {sInProgress > 0 && <div className="bar-segment bar-in-progress" style={{ width: `${sPct(sInProgress)}%` }} />}
                {sRevision > 0 && <div className="bar-segment bar-revision" style={{ width: `${sPct(sRevision)}%` }} />}
              </div>
              <ul className="section-articles">
                {arts.map((a) => {
                  const st = progress[a.slug] || 'unmarked'
                  const color = STATUS_COLORS[st]
                  return (
                    <li key={a.slug}>
                      <Link to={`/article/${a.slug}`} className="section-article-link">
                        <span className="section-article-dot" style={{ background: color || 'var(--color-border)' }} />
                        <span className="section-article-title">{a.title}</span>
                        {st !== 'unmarked' && <span className="section-article-status" style={{ color: color }}>{STATUS_LABELS[st]}</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
      <DataManager />
      <Confetti trigger={confettiKey} />
    </div>
  )
}
