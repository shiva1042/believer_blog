import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { saveAttempt } from '../utils/analytics.js'
import './Quiz.css'

function QuizInstance({ data, portalTarget, articleSlug, articleSection }) {
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState({})
  const [showAll, setShowAll] = useState(true)
  const [currentQ, setCurrentQ] = useState(0)
  const [saved, setSaved] = useState(false)
  const startTimeRef = useRef(Date.now())
  const hasSavedRef = useRef(false)

  const questions = data.questions || []
  const totalQ = questions.length

  const score = Object.keys(checked).reduce((acc, idx) => {
    return acc + (answers[idx] === questions[idx].answer ? 1 : 0)
  }, 0)
  const answeredCount = Object.keys(checked).length
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

  // Auto-save when all questions are answered
  useEffect(() => {
    if (totalQ > 0 && answeredCount === totalQ && !hasSavedRef.current) {
      hasSavedRef.current = true
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000)
      const wrongQuestions = []
      questions.forEach((q, idx) => {
        if (answers[idx] !== q.answer) {
          wrongQuestions.push({
            question: q.question,
            userAnswer: q.options[answers[idx]] || 'No answer',
            correctAnswer: q.options[q.answer],
            explanation: q.explanation || '',
          })
        }
      })
      saveAttempt({
        slug: articleSlug || '',
        title: data.title || 'Practice Quiz',
        section: articleSection || 'Unknown',
        totalQuestions: totalQ,
        correctAnswers: score,
        timeSpent,
        wrongQuestions,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }, [answeredCount, totalQ, answers, questions, score, data.title, articleSlug, articleSection])

  const reset = () => {
    setAnswers({})
    setChecked({})
    setCurrentQ(0)
    hasSavedRef.current = false
    startTimeRef.current = Date.now()
  }

  const selectOption = (qIdx, optIdx) => {
    if (checked[qIdx] !== undefined) return
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
  }

  const checkAnswer = (qIdx) => {
    if (answers[qIdx] === undefined) return
    setChecked(prev => ({ ...prev, [qIdx]: true }))
  }

  const renderQuestion = (q, qIdx) => {
    const isChecked = checked[qIdx] !== undefined
    const selectedOpt = answers[qIdx]
    const isCorrect = isChecked && selectedOpt === q.answer
    const cardClass = isChecked ? (isCorrect ? 'answered-correct' : 'answered-wrong') : ''

    return (
      <div key={qIdx} className={`quiz-question-card ${cardClass}`}>
        <span className="quiz-question-number">Question {qIdx + 1}</span>
        <p className="quiz-question-text">{q.question}</p>
        <ul className="quiz-options">
          {q.options.map((opt, optIdx) => {
            let optClass = ''
            if (isChecked) {
              optClass = 'disabled '
              if (optIdx === q.answer) optClass += 'correct'
              else if (optIdx === selectedOpt) optClass += 'wrong'
              else if (optIdx === q.answer) optClass += 'correct-answer-highlight'
            } else if (optIdx === selectedOpt) {
              optClass = 'selected'
            }

            return (
              <li
                key={optIdx}
                className={`quiz-option ${optClass}`}
                onClick={() => selectOption(qIdx, optIdx)}
              >
                <div className="quiz-option-radio">
                  <div className="quiz-option-radio-inner" />
                </div>
                <span className="quiz-option-label">
                  <span className="quiz-option-letter">{letters[optIdx]}.</span>
                  <span>{opt}</span>
                </span>
              </li>
            )
          })}
        </ul>
        {!isChecked && (
          <button
            className="quiz-check-btn"
            disabled={selectedOpt === undefined}
            onClick={() => checkAnswer(qIdx)}
          >
            Check Answer
          </button>
        )}
        {isChecked && (
          <div className={`quiz-explanation ${isCorrect ? 'correct' : 'wrong'}`}>
            <span className="quiz-explanation-icon">{isCorrect ? 'Correct!' : 'Incorrect.'}</span>
            {' '}{q.explanation}
            {!isCorrect && (
              <span> The correct answer is {letters[q.answer]}.</span>
            )}
          </div>
        )}
      </div>
    )
  }

  const content = (
    <div className="quiz-container">
      <div className="quiz-header">
        <h3>{data.title || 'Practice Quiz'}</h3>
        <span className="quiz-score">
          Score: {score}/{totalQ} {answeredCount > 0 && `(${answeredCount} answered)`}
          {saved && <span className="quiz-saved-msg"> — Results saved!</span>}
        </span>
        <div className="quiz-controls">
          <button
            className="quiz-btn quiz-btn-toggle"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'One at a time' : 'Show all'}
          </button>
          <button className="quiz-btn quiz-btn-reset" onClick={reset}>
            Reset Quiz
          </button>
        </div>
      </div>
      <div className="quiz-body">
        {showAll ? (
          questions.map((q, idx) => renderQuestion(q, idx))
        ) : (
          <>
            {renderQuestion(questions[currentQ], currentQ)}
            <div className="quiz-nav">
              <button
                className="quiz-nav-btn"
                disabled={currentQ === 0}
                onClick={() => setCurrentQ(prev => prev - 1)}
              >
                Previous
              </button>
              <span className="quiz-progress-text">
                {currentQ + 1} / {totalQ}
              </span>
              <button
                className="quiz-nav-btn"
                disabled={currentQ === totalQ - 1}
                onClick={() => setCurrentQ(prev => prev + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )

  if (portalTarget) {
    return createPortal(content, portalTarget)
  }
  return content
}

export default function Quiz({ contentRef, articleSlug, articleSection }) {
  const [quizzes, setQuizzes] = useState([])

  const findQuizzes = useCallback(() => {
    if (!contentRef?.current) return
    const scripts = contentRef.current.querySelectorAll('script.quiz-data[type="application/json"]')
    const found = []

    scripts.forEach((script, idx) => {
      try {
        const data = JSON.parse(script.textContent)
        // Create a container div to render the quiz into
        let container = script.parentElement.querySelector('.quiz-render-target')
        if (!container) {
          container = document.createElement('div')
          container.className = 'quiz-render-target'
          script.parentElement.insertBefore(container, script.nextSibling)
        }
        found.push({ data, container, id: idx })
      } catch {
        // skip malformed quiz data
      }
    })

    setQuizzes(found)
  }, [contentRef])

  useEffect(() => {
    // Small delay to ensure the article HTML has rendered
    const timer = setTimeout(findQuizzes, 200)
    return () => clearTimeout(timer)
  }, [findQuizzes])

  if (quizzes.length === 0) return null

  return (
    <>
      {quizzes.map(({ data, container, id }) => (
        <QuizInstance key={id} data={data} portalTarget={container} articleSlug={articleSlug} articleSection={articleSection} />
      ))}
    </>
  )
}
