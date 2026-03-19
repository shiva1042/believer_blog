import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  getAttempts,
  getStats,
  getSectionStats,
  getWeakSections,
  getScoreTrend,
  clearAnalytics,
} from '../utils/analytics.js'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import './Analytics.css'

function OverviewCards({ stats }) {
  const cards = [
    { label: 'Total Tests Taken', value: stats.totalAttempts, color: '#6366f1' },
    { label: 'Average Score', value: `${stats.avgScore}%`, color: '#22c55e' },
    { label: 'Best Score', value: `${stats.bestScore}%`, color: '#f59e0b' },
    { label: 'Questions Attempted', value: stats.totalQuestions, color: '#3b82f6' },
  ]
  return (
    <div className="analytics-cards">
      {cards.map((c) => (
        <div key={c.label} className="analytics-card" style={{ borderTopColor: c.color }}>
          <span className="analytics-card-value" style={{ color: c.color }}>{c.value}</span>
          <span className="analytics-card-label">{c.label}</span>
        </div>
      ))}
    </div>
  )
}

function ScoreTrendChart({ trend }) {
  const svgRef = useRef(null)
  const [tooltip, setTooltip] = useState(null)

  if (trend.length === 0) {
    return <div className="analytics-empty">No score data yet. Take some quizzes to see your trend.</div>
  }

  const W = 700, H = 300, PAD = 50, PADR = 20, PADT = 20, PADB = 50
  const chartW = W - PAD - PADR
  const chartH = H - PADT - PADB
  const n = trend.length

  const xStep = n > 1 ? chartW / (n - 1) : chartW / 2
  const points = trend.map((t, i) => ({
    x: PAD + (n > 1 ? i * xStep : chartW / 2),
    y: PADT + chartH - (t.score / 100) * chartH,
    ...t,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  const yTicks = [0, 25, 50, 75, 100]

  const handleMouseMove = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const scaleX = W / rect.width
    const scaledX = mouseX * scaleX
    let closest = points[0]
    let minDist = Infinity
    points.forEach((p) => {
      const d = Math.abs(p.x - scaledX)
      if (d < minDist) { minDist = d; closest = p }
    })
    if (minDist < 40) {
      setTooltip({ x: closest.x, y: closest.y, score: closest.score, date: closest.date, title: closest.title })
    } else {
      setTooltip(null)
    }
  }

  return (
    <div className="analytics-chart-wrap">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="analytics-chart-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {yTicks.map((t) => {
          const y = PADT + chartH - (t / 100) * chartH
          return (
            <g key={t}>
              <line x1={PAD} y1={y} x2={W - PADR} y2={y} stroke="var(--color-border)" strokeWidth="1" strokeDasharray="4 4" />
              <text x={PAD - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--color-muted)">{t}%</text>
            </g>
          )
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Area fill */}
        <path
          d={`${pathD} L ${points[points.length - 1].x} ${PADT + chartH} L ${points[0].x} ${PADT + chartH} Z`}
          fill="url(#areaGrad)"
          opacity="0.15"
        />
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="5" fill="#6366f1" stroke="#fff" strokeWidth="2" />
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => {
          // Show at most 10 labels
          if (n > 10 && i % Math.ceil(n / 10) !== 0 && i !== n - 1) return null
          const d = new Date(p.date)
          const label = `${d.getMonth() + 1}/${d.getDate()}`
          return (
            <text key={i} x={p.x} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--color-muted)">{label}</text>
          )
        })}

        {/* Tooltip */}
        {tooltip && (
          <g>
            <line x1={tooltip.x} y1={PADT} x2={tooltip.x} y2={PADT + chartH} stroke="#6366f1" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={tooltip.x} cy={tooltip.y} r="7" fill="#6366f1" stroke="#fff" strokeWidth="2" />
            <rect x={tooltip.x - 60} y={tooltip.y - 46} width="120" height="38" rx="6" fill="var(--color-surface)" stroke="var(--color-border)" />
            <text x={tooltip.x} y={tooltip.y - 30} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-heading)">{tooltip.score}%</text>
            <text x={tooltip.x} y={tooltip.y - 16} textAnchor="middle" fontSize="10" fill="var(--color-muted)">{new Date(tooltip.date).toLocaleDateString()}</text>
          </g>
        )}
      </svg>
    </div>
  )
}

function SectionPerformance({ sectionStats, weakSections }) {
  const entries = Object.entries(sectionStats).sort((a, b) => b[1].accuracy - a[1].accuracy)

  if (entries.length === 0) {
    return <div className="analytics-empty">No section data yet.</div>
  }

  const barColor = (acc) => acc >= 80 ? '#22c55e' : acc >= 60 ? '#f59e0b' : '#ef4444'
  const weakOnes = weakSections.filter((s) => s.accuracy < 60)

  return (
    <div className="analytics-section-perf">
      <div className="analytics-bars">
        {entries.map(([name, data]) => (
          <div key={name} className="analytics-bar-row">
            <span className="analytics-bar-label">{name}</span>
            <div className="analytics-bar-track">
              <div
                className="analytics-bar-fill"
                style={{ width: `${data.accuracy}%`, background: barColor(data.accuracy) }}
              />
            </div>
            <span className="analytics-bar-pct" style={{ color: barColor(data.accuracy) }}>{data.accuracy}%</span>
            <span className="analytics-bar-detail">{data.correct}/{data.total}</span>
          </div>
        ))}
      </div>
      {weakOnes.length > 0 && (
        <div className="analytics-weak-callout">
          <strong>Weak Areas:</strong> {weakOnes.map((w) => w.name).join(', ')}
        </div>
      )}
    </div>
  )
}

function RecentAttempts({ attempts }) {
  const [expanded, setExpanded] = useState(null)
  const recent = [...attempts].reverse().slice(0, 20)

  if (recent.length === 0) {
    return <div className="analytics-empty">No attempts recorded yet.</div>
  }

  const toggle = (id) => setExpanded((prev) => (prev === id ? null : id))

  return (
    <div className="analytics-table-wrap">
      <table className="analytics-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Test Name</th>
            <th>Score</th>
            <th>Time</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {recent.map((a) => (
            <>
              <tr key={a.id} className={expanded === a.id ? 'row-expanded' : ''}>
                <td>{new Date(a.date).toLocaleDateString()}</td>
                <td>{a.title}</td>
                <td>
                  <span className={`score-badge ${a.score >= 80 ? 'good' : a.score >= 60 ? 'ok' : 'bad'}`}>
                    {a.score}%
                  </span>
                  <span className="score-fraction"> ({a.correctAnswers}/{a.totalQuestions})</span>
                </td>
                <td>{a.timeSpent > 0 ? formatTime(a.timeSpent) : '--'}</td>
                <td>
                  {a.wrongQuestions.length > 0 ? (
                    <button className="analytics-detail-btn" onClick={() => toggle(a.id)}>
                      {expanded === a.id ? 'Hide' : 'View Details'}
                    </button>
                  ) : (
                    <span className="perfect-score">Perfect!</span>
                  )}
                </td>
              </tr>
              {expanded === a.id && a.wrongQuestions.length > 0 && (
                <tr key={`${a.id}-detail`} className="detail-row">
                  <td colSpan="5">
                    <div className="wrong-questions">
                      <h4>Wrong Answers</h4>
                      {a.wrongQuestions.map((wq, i) => (
                        <div key={i} className="wrong-q-item">
                          <p className="wrong-q-text">{wq.question}</p>
                          <div className="wrong-q-answers">
                            <span className="wrong-q-yours">Your answer: {wq.userAnswer}</span>
                            <span className="wrong-q-correct">Correct: {wq.correctAnswer}</span>
                          </div>
                          {wq.explanation && <p className="wrong-q-explanation">{wq.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Recommendations({ weakSections, attempts, articles }) {
  const weak = weakSections.filter((s) => s.accuracy < 60)
  const lowScoreAttempts = attempts.filter((a) => a.score < 60)
  // Unique slugs for retake
  const retakeSlugs = [...new Set(lowScoreAttempts.map((a) => a.slug))].slice(0, 5)
  const retakeItems = retakeSlugs.map((slug) => {
    const attempt = lowScoreAttempts.find((a) => a.slug === slug)
    return { slug, title: attempt?.title || slug }
  })

  // Find articles matching weak sections
  const weakArticles = weak.flatMap((w) =>
    articles.filter((a) => a.section === w.name).slice(0, 2)
  )

  if (weak.length === 0 && retakeItems.length === 0) {
    return (
      <div className="analytics-recommendations">
        <p className="analytics-rec-great">Great job! You are performing well across all sections. Keep it up!</p>
      </div>
    )
  }

  return (
    <div className="analytics-recommendations">
      {weak.length > 0 && (
        <div className="analytics-rec-block">
          <h4>Based on your performance, focus on:</h4>
          <ul>
            {weak.map((w) => (
              <li key={w.name}>
                <strong>{w.name}</strong> — {w.accuracy}% accuracy ({w.correct}/{w.total})
              </li>
            ))}
          </ul>
          {weakArticles.length > 0 && (
            <div className="analytics-rec-links">
              <h4>Recommended articles:</h4>
              <ul>
                {weakArticles.map((a) => (
                  <li key={a.slug}><Link to={`/article/${a.slug}`}>{a.title}</Link> ({a.section})</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {retakeItems.length > 0 && (
        <div className="analytics-rec-block">
          <h4>You should retake:</h4>
          <ul>
            {retakeItems.map((r) => (
              <li key={r.slug}><Link to={`/article/${r.slug}`}>{r.title}</Link></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export default function Analytics() {
  useDocumentTitle('Test Analytics')

  const [stats, setStats] = useState({ totalAttempts: 0, avgScore: 0, bestScore: 0, totalQuestions: 0, totalCorrect: 0 })
  const [sectionStats, setSectionStats] = useState({})
  const [weakSections, setWeakSections] = useState([])
  const [scoreTrend, setScoreTrend] = useState([])
  const [attempts, setAttempts] = useState([])
  const [articles, setArticles] = useState([])

  const reload = () => {
    setStats(getStats())
    setSectionStats(getSectionStats())
    setWeakSections(getWeakSections())
    setScoreTrend(getScoreTrend())
    setAttempts(getAttempts())
  }

  useEffect(() => {
    reload()
    fetch('/articles/articles.json')
      .then((r) => r.json())
      .then(setArticles)
      .catch(() => setArticles([]))
  }, [])

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
      clearAnalytics()
      reload()
    }
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div>
          <h1 className="analytics-title">Test Analytics</h1>
          <p className="analytics-subtitle">Track your quiz performance and identify areas for improvement.</p>
        </div>
        {stats.totalAttempts > 0 && (
          <button className="analytics-clear-btn" onClick={handleClear}>Clear Data</button>
        )}
      </div>

      <OverviewCards stats={stats} />

      <section className="analytics-section">
        <h2 className="analytics-section-title">Score Trend</h2>
        <ScoreTrendChart trend={scoreTrend} />
      </section>

      <section className="analytics-section">
        <h2 className="analytics-section-title">Section Performance</h2>
        <SectionPerformance sectionStats={sectionStats} weakSections={weakSections} />
      </section>

      <section className="analytics-section">
        <h2 className="analytics-section-title">Recent Attempts</h2>
        <RecentAttempts attempts={attempts} />
      </section>

      <section className="analytics-section">
        <h2 className="analytics-section-title">Recommendations</h2>
        <Recommendations weakSections={weakSections} attempts={attempts} articles={articles} />
      </section>
    </div>
  )
}
