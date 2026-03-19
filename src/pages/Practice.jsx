import { useState, useEffect, useCallback, useMemo } from 'react'
import { loadAllQuizzes, getRandomQuestion } from '../utils/quizPool.js'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import './Practice.css'

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export default function Practice() {
  useDocumentTitle('Random Practice')

  const [pool, setPool] = useState([])
  const [loading, setLoading] = useState(true)
  const [sectionFilter, setSectionFilter] = useState('All Sections')

  // Session state
  const [currentQuestion, setCurrentQuestion] = useState(null)
  const [selectedOption, setSelectedOption] = useState(null)
  const [checked, setChecked] = useState(false)
  const [answeredIds, setAnsweredIds] = useState(new Set())
  const [results, setResults] = useState([]) // { id, correct, section }
  const [streak, setStreak] = useState(0)
  const [showSummary, setShowSummary] = useState(false)
  const [questionsAnswered, setQuestionsAnswered] = useState(0)

  // Load quiz pool on mount
  useEffect(() => {
    loadAllQuizzes()
      .then((data) => {
        setPool(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Get unique sections from pool
  const sections = useMemo(() => {
    const s = new Set(pool.map((q) => q.sourceSection))
    return ['All Sections', ...Array.from(s).sort()]
  }, [pool])

  // Filtered pool count
  const filteredCount = useMemo(() => {
    if (sectionFilter === 'All Sections') return pool.length
    return pool.filter((q) => q.sourceSection === sectionFilter).length
  }, [pool, sectionFilter])

  const answeredInFilter = useMemo(() => {
    if (sectionFilter === 'All Sections') return answeredIds.size
    return results.filter((r) => r.section === sectionFilter).length
  }, [answeredIds, results, sectionFilter])

  const correctCount = results.filter((r) => r.correct).length
  const accuracy = questionsAnswered > 0
    ? ((correctCount / questionsAnswered) * 100).toFixed(1)
    : '0.0'

  // Pick next question
  const pickNext = useCallback(() => {
    const q = getRandomQuestion(pool, answeredIds, sectionFilter)
    setCurrentQuestion(q)
    setSelectedOption(null)
    setChecked(false)
  }, [pool, answeredIds, sectionFilter])

  // Pick first question once pool is loaded
  useEffect(() => {
    if (pool.length > 0 && !currentQuestion && !showSummary) {
      pickNext()
    }
  }, [pool, currentQuestion, showSummary, pickNext])

  const handleOptionClick = (idx) => {
    if (checked) return
    setSelectedOption(idx)
  }

  const handleCheck = () => {
    if (selectedOption === null || !currentQuestion) return
    setChecked(true)
    const isCorrect = selectedOption === currentQuestion.answer
    const newAnswered = new Set(answeredIds)
    newAnswered.add(currentQuestion.id)
    setAnsweredIds(newAnswered)
    setQuestionsAnswered((c) => c + 1)
    setResults((prev) => [
      ...prev,
      { id: currentQuestion.id, correct: isCorrect, section: currentQuestion.sourceSection },
    ])
    setStreak((s) => (isCorrect ? s + 1 : 0))
  }

  const handleNext = () => {
    const q = getRandomQuestion(pool, answeredIds, sectionFilter)
    if (!q) {
      setShowSummary(true)
      setCurrentQuestion(null)
    } else {
      setCurrentQuestion(q)
      setSelectedOption(null)
      setChecked(false)
    }
  }

  const handleEndSession = () => {
    setShowSummary(true)
    setCurrentQuestion(null)
  }

  const handleResetSession = () => {
    setAnsweredIds(new Set())
    setResults([])
    setStreak(0)
    setQuestionsAnswered(0)
    setShowSummary(false)
    setCurrentQuestion(null)
    setSelectedOption(null)
    setChecked(false)
    // Will trigger pickNext via useEffect
  }

  const handleRetryWrong = () => {
    const wrongIds = new Set(results.filter((r) => !r.correct).map((r) => r.id))
    // Keep only correct answers in answered set
    const newAnswered = new Set(results.filter((r) => r.correct).map((r) => r.id))
    setAnsweredIds(newAnswered)
    setResults(results.filter((r) => r.correct))
    setQuestionsAnswered(results.filter((r) => r.correct).length)
    setStreak(0)
    setShowSummary(false)
    setCurrentQuestion(null)
    setSelectedOption(null)
    setChecked(false)
  }

  const handleSectionChange = (e) => {
    setSectionFilter(e.target.value)
    // Pick a new question in the new section
    setTimeout(() => {
      setCurrentQuestion(null)
      setSelectedOption(null)
      setChecked(false)
    }, 0)
  }

  // Section breakdown for summary
  const sectionBreakdown = useMemo(() => {
    const map = {}
    results.forEach((r) => {
      if (!map[r.section]) map[r.section] = { total: 0, correct: 0 }
      map[r.section].total++
      if (r.correct) map[r.section].correct++
    })
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
  }, [results])

  const wrongCount = questionsAnswered - correctCount

  if (loading) {
    return (
      <div className="practice-page">
        <div className="practice-loading">
          <div className="practice-loading-spinner" />
          <p>Loading questions from all articles...</p>
        </div>
      </div>
    )
  }

  if (pool.length === 0) {
    return (
      <div className="practice-page">
        <div className="practice-empty">
          <p>No quiz questions found in any articles.</p>
        </div>
      </div>
    )
  }

  // Session Summary
  if (showSummary) {
    return (
      <div className="practice-page">
        <div className="practice-header">
          <h1 className="practice-title">Random Practice</h1>
        </div>
        <div className="practice-summary">
          <h2>Session Summary</h2>
          <div className="practice-summary-stats">
            <div className="practice-summary-stat">
              <span className="stat-value total-val">{questionsAnswered}</span>
              <span className="stat-label">Answered</span>
            </div>
            <div className="practice-summary-stat">
              <span className="stat-value correct-val">{correctCount}</span>
              <span className="stat-label">Correct</span>
            </div>
            <div className="practice-summary-stat">
              <span className="stat-value wrong-val">{wrongCount}</span>
              <span className="stat-label">Wrong</span>
            </div>
          </div>

          <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-heading)' }}>
            Accuracy: {accuracy}%
          </p>

          {sectionBreakdown.length > 0 && (
            <div className="practice-section-breakdown">
              <h3>Per-Section Accuracy</h3>
              {sectionBreakdown.map(([section, data]) => {
                const pct = ((data.correct / data.total) * 100).toFixed(1)
                return (
                  <div key={section} className="practice-section-row">
                    <span className="practice-section-name">{section}</span>
                    <span
                      className="practice-section-accuracy"
                      style={{ color: parseFloat(pct) >= 70 ? '#22c55e' : parseFloat(pct) >= 40 ? '#f59e0b' : '#ef4444' }}
                    >
                      {data.correct}/{data.total} ({pct}%)
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          <div className="practice-summary-actions">
            {wrongCount > 0 && (
              <button className="practice-btn practice-btn-primary" onClick={handleRetryWrong}>
                Retry wrong questions
              </button>
            )}
            <button className="practice-btn" onClick={handleResetSession}>
              Start new session
            </button>
          </div>
        </div>
      </div>
    )
  }

  // No more questions in filter
  if (!currentQuestion) {
    return (
      <div className="practice-page">
        <div className="practice-header">
          <h1 className="practice-title">Random Practice</h1>
          <div className="practice-stats-bar">
            <span>Questions answered: {questionsAnswered}</span>
            <span>Correct: {correctCount}</span>
            <span>Accuracy: {accuracy}%</span>
          </div>
        </div>
        <div className="practice-controls">
          <select className="practice-select" value={sectionFilter} onChange={handleSectionChange}>
            {sections.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="practice-empty">
          <p>All questions in this section have been answered!</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="practice-btn practice-btn-primary" onClick={handleEndSession}>
              View Session Summary
            </button>
            <button className="practice-btn" onClick={handleResetSession}>
              Start new session
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isCorrect = checked && selectedOption === currentQuestion.answer

  return (
    <div className="practice-page">
      <div className="practice-header">
        <h1 className="practice-title">Random Practice</h1>
        <div className="practice-stats-bar">
          <span>Questions answered: {questionsAnswered}</span>
          <span>Correct: {correctCount}</span>
          <span>Accuracy: {accuracy}%</span>
        </div>
      </div>

      <div className="practice-controls">
        <select className="practice-select" value={sectionFilter} onChange={handleSectionChange}>
          {sections.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.82rem', color: 'var(--color-text-light)' }}>
          {answeredInFilter}/{filteredCount} answered
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {questionsAnswered > 0 && (
            <button className="practice-btn practice-btn-danger" onClick={handleEndSession}>
              End Session
            </button>
          )}
          <button className="practice-btn" onClick={handleResetSession}>
            Reset Session
          </button>
        </div>
      </div>

      {streak >= 3 && (
        <div className={`practice-streak${streak >= 5 ? ' fire' : ''}`}>
          Current streak: {streak} {streak >= 5 ? '\uD83D\uDD25' : '\u2B50'}
        </div>
      )}

      <div className="practice-question-card">
        <div className="practice-question-meta">
          <span className="practice-question-number">Q{questionsAnswered + 1}</span>
          <span className="practice-question-source">{currentQuestion.sourceSection}</span>
          <span className="practice-question-source">{currentQuestion.sourceTitle}</span>
        </div>

        <div className="practice-question-text">{currentQuestion.question}</div>

        <ul className="practice-options">
          {currentQuestion.options.map((opt, idx) => {
            let cls = 'practice-option'
            if (checked) {
              cls += ' disabled'
              if (idx === currentQuestion.answer) cls += ' correct correct-highlight'
              else if (idx === selectedOption) cls += ' wrong'
            } else if (idx === selectedOption) {
              cls += ' selected'
            }
            return (
              <li key={idx} className={cls} onClick={() => handleOptionClick(idx)}>
                <div className="practice-option-radio">
                  <div className="practice-option-radio-dot" />
                </div>
                <div className="practice-option-label">
                  <span className="practice-option-letter">{LETTERS[idx]}.</span>
                  <span>{opt}</span>
                </div>
              </li>
            )
          })}
        </ul>

        {!checked && (
          <button
            className="practice-check-btn"
            disabled={selectedOption === null}
            onClick={handleCheck}
          >
            Check Answer
          </button>
        )}

        {checked && (
          <>
            <div className={`practice-explanation ${isCorrect ? 'correct' : 'wrong'}`}>
              <strong>{isCorrect ? 'Correct!' : 'Incorrect.'}</strong>{' '}
              {currentQuestion.explanation}
            </div>
            <div className="practice-next-area">
              <button className="practice-btn practice-btn-primary" onClick={handleNext}>
                Next Question &rarr;
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
