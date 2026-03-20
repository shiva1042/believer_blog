import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import mermaid from 'mermaid'
import { attachMermaidZoom } from '../utils/mermaidZoom.js'
import './SwipeDeck.css'

/**
 * Extract quiz JSON data from raw HTML before stripping scripts.
 */
function extractQuizData(htmlString) {
  const quizzes = []
  const regex = /<script\s+(?:class="quiz-data"\s+type="application\/json"|type="application\/json"\s+class="quiz-data")>([\s\S]*?)<\/script>/gi
  let match
  while ((match = regex.exec(htmlString)) !== null) {
    try {
      quizzes.push(JSON.parse(match[1]))
    } catch { /* skip malformed */ }
  }
  return quizzes
}

/**
 * Strip <style> and <script> tags, extract body/article content.
 */
function extractBodyContent(htmlString) {
  if (!htmlString) return ''
  let clean = htmlString.replace(/<style[\s\S]*?<\/style>/gi, '')
  clean = clean.replace(/<script[\s\S]*?<\/script>/gi, '')
  const bodyMatch = clean.match(/<body[^>]*>([\s\S]*)<\/body>/i)
  if (bodyMatch) clean = bodyMatch[1]
  const articleMatch = clean.match(/<article[^>]*>([\s\S]*)<\/article>/i)
  if (articleMatch) clean = articleMatch[1]
  return clean.trim()
}

/**
 * Parse HTML into slides. Also converts quiz questions into individual cards.
 */
function parseHtmlToSlides(htmlString) {
  // First extract quiz data before stripping scripts
  const quizzes = extractQuizData(htmlString)

  const content = extractBodyContent(htmlString)
  if (!content) return { slides: [], quizzes }

  const parser = new DOMParser()
  const doc = parser.parseFromString(`<div>${content}</div>`, 'text/html')
  const container = doc.body.firstElementChild
  if (!container) return { slides: [], quizzes }

  const elements = Array.from(container.children)
  if (elements.length === 0) return { slides: [], quizzes }

  const slides = []
  let i = 0

  while (i < elements.length) {
    const el = elements[i]
    const tag = el.tagName

    if (/^H[1-6]$/.test(tag)) {
      const group = [el]
      i++
      let contentCount = 0
      while (i < elements.length && !/^H[1-6]$/.test(elements[i].tagName)) {
        group.push(elements[i])
        contentCount++
        i++
        const lastEl = group[group.length - 1]
        const isBig = lastEl.tagName === 'TABLE' || lastEl.tagName === 'PRE' ||
          lastEl.classList?.contains('mermaid') || lastEl.tagName === 'DIV'
        if (isBig || contentCount >= 3) break
      }
      slides.push(group)
    } else {
      slides.push([el])
      i++
    }
  }

  const built = slides.map((group, idx) => {
    const wrapper = document.createElement('div')
    group.forEach((el) => {
      const clone = el.cloneNode(true)
      stripInlineStyles(clone)
      wrapper.appendChild(clone)
    })
    const headingEl = group.find((el) => /^H[1-6]$/.test(el.tagName))
    const heading = headingEl?.textContent?.trim() || getContentLabel(group[0])
    return { id: idx, html: wrapper.innerHTML, heading, type: 'content' }
  })

  // If there are quiz questions, add each as a card
  let cardId = built.length
  quizzes.forEach((quiz) => {
    if (!quiz.questions) return
    quiz.questions.forEach((q, qIdx) => {
      built.push({
        id: cardId++,
        type: 'quiz',
        heading: `Question ${qIdx + 1}`,
        question: q.question,
        options: q.options,
        answer: q.answer,
        explanation: q.explanation || '',
      })
    })
  })

  return { slides: built, quizzes }
}

function stripInlineStyles(el) {
  if (el.style) {
    el.style.removeProperty('color')
    el.style.removeProperty('background')
    el.style.removeProperty('background-color')
  }
  if (el.children) {
    Array.from(el.children).forEach(stripInlineStyles)
  }
}

function getContentLabel(el) {
  if (!el) return 'Content'
  const text = (el.textContent || '').trim()
  if (text.length > 40) return text.slice(0, 40) + '...'
  if (text.length > 0) return text
  if (el.tagName === 'TABLE') return 'Table'
  if (el.tagName === 'PRE') return 'Code'
  if (el.classList?.contains('mermaid')) return 'Diagram'
  if (el.tagName === 'IMG') return 'Image'
  return 'Content'
}

/** Interactive quiz card rendered inside a swipe card */
function QuizCard({ slide, onAnswer }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const letters = ['A', 'B', 'C', 'D', 'E', 'F']

  const handleSelect = (idx) => {
    if (revealed) return
    setSelected(idx)
  }

  const handleCheck = () => {
    if (selected === null) return
    setRevealed(true)
    onAnswer?.(selected === slide.answer)
  }

  const isCorrect = revealed && selected === slide.answer

  return (
    <div className="quiz-swipe-card">
      <p className="quiz-swipe-question">{slide.question}</p>
      <ul className="quiz-swipe-options">
        {slide.options.map((opt, idx) => {
          let cls = 'quiz-swipe-opt'
          if (revealed) {
            if (idx === slide.answer) cls += ' correct'
            else if (idx === selected) cls += ' wrong'
          } else if (idx === selected) {
            cls += ' selected'
          }
          return (
            <li key={idx} className={cls} onClick={() => handleSelect(idx)}>
              <span className="quiz-swipe-letter">{letters[idx]}</span>
              <span className="quiz-swipe-text">{opt.replace(/^\([A-Z]\)\s*/, '')}</span>
            </li>
          )
        })}
      </ul>
      {!revealed && (
        <button
          className="quiz-swipe-check"
          disabled={selected === null}
          onClick={handleCheck}
        >
          Check Answer
        </button>
      )}
      {revealed && (
        <div className={`quiz-swipe-result ${isCorrect ? 'correct' : 'wrong'}`}>
          <strong>{isCorrect ? 'Correct!' : `Incorrect. Answer: ${letters[slide.answer]}`}</strong>
          <p>{slide.explanation}</p>
        </div>
      )}
    </div>
  )
}

export default function SwipeDeck({ htmlContent }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [exitDirection, setExitDirection] = useState(null)
  const [score, setScore] = useState({ correct: 0, answered: 0 })
  const cardBodyRef = useRef(null)
  const startX = useRef(0)
  const startY = useRef(0)
  const isHorizontalSwipe = useRef(null)
  // Cache rendered mermaid SVGs per slide so we never show raw code again
  const mermaidCache = useRef({})

  const SWIPE_THRESHOLD = 60

  const { slides } = useMemo(() => parseHtmlToSlides(htmlContent), [htmlContent])

  const hasQuiz = slides.some((s) => s.type === 'quiz')
  const totalQuestions = slides.filter((s) => s.type === 'quiz').length

  useEffect(() => {
    setCurrentIndex(0)
    setScore({ correct: 0, answered: 0 })
    mermaidCache.current = {}
  }, [htmlContent])

  // Run mermaid on current card — cache SVGs so they never re-render as code
  useEffect(() => {
    if (!cardBodyRef.current) return

    const mermaidDivs = cardBodyRef.current.querySelectorAll('.mermaid')
    if (mermaidDivs.length === 0) return

    // Check if we have cached SVGs for this slide
    const cached = mermaidCache.current[currentIndex]
    if (cached) {
      // Inject cached SVGs directly — no mermaid processing needed
      mermaidDivs.forEach((div, i) => {
        if (cached[i]) {
          div.innerHTML = cached[i]
          div.setAttribute('data-processed', 'true')
        }
      })
      attachMermaidZoom(cardBodyRef.current)
      return
    }

    // First time: let mermaid render, then cache the result
    mermaidDivs.forEach((div) => div.removeAttribute('data-processed'))

    mermaid.run({ nodes: Array.from(mermaidDivs) }).then(() => {
      // Cache the rendered SVGs
      const svgs = {}
      mermaidDivs.forEach((div, i) => {
        svgs[i] = div.innerHTML
      })
      mermaidCache.current[currentIndex] = svgs
      if (cardBodyRef.current) attachMermaidZoom(cardBodyRef.current)
    }).catch(() => {})
  }, [currentIndex, slides])

  const goTo = useCallback((index) => {
    if (index < 0 || index >= slides.length || index === currentIndex) return
    const dir = index > currentIndex ? 'left' : 'right'
    setExitDirection(dir)
    setTimeout(() => {
      setCurrentIndex(index)
      setExitDirection(null)
      setDragOffset(0)
    }, 200)
  }, [currentIndex, slides.length])

  const goNext = useCallback(() => {
    if (currentIndex < slides.length - 1) goTo(currentIndex + 1)
  }, [currentIndex, slides.length, goTo])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) goTo(currentIndex - 1)
  }, [currentIndex, goTo])

  const handlePointerDown = useCallback((e) => {
    if (e.target.closest('a, button, .quiz-swipe-opt, .quiz-swipe-check')) return
    setIsDragging(true)
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    startY.current = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    isHorizontalSwipe.current = null
  }, [])

  const handlePointerMove = useCallback((e) => {
    if (!isDragging) return
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const diffX = clientX - startX.current
    const diffY = clientY - startY.current
    if (isHorizontalSwipe.current === null && (Math.abs(diffX) > 8 || Math.abs(diffY) > 8)) {
      isHorizontalSwipe.current = Math.abs(diffX) > Math.abs(diffY)
    }
    if (isHorizontalSwipe.current) {
      e.preventDefault?.()
      setDragOffset(diffX)
    }
  }, [isDragging])

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragOffset < -SWIPE_THRESHOLD) goNext()
    else if (dragOffset > SWIPE_THRESHOLD) goPrev()
    else setDragOffset(0)
    isHorizontalSwipe.current = null
  }, [isDragging, dragOffset, goNext, goPrev])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowRight') goNext()
      if (e.key === 'ArrowLeft') goPrev()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [goNext, goPrev])

  const handleQuizAnswer = useCallback((isCorrect) => {
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      answered: prev.answered + 1,
    }))
  }, [])

  if (slides.length === 0) return <p className="deck-empty">Loading cards...</p>

  const slide = slides[currentIndex]
  const rotation = dragOffset * 0.04
  const cardTransform = exitDirection === 'left'
    ? 'translateX(-110%) rotate(-10deg)'
    : exitDirection === 'right'
    ? 'translateX(110%) rotate(10deg)'
    : `translateX(${dragOffset}px) rotate(${rotation}deg)`

  const progress = slides.length > 1 ? (currentIndex / (slides.length - 1)) * 100 : 100

  return (
    <div className="swipe-deck-wrapper">
      {/* Top bar */}
      <div className="deck-top-bar">
        <span className="deck-counter">
          <span className="deck-counter-current">{currentIndex + 1}</span>
          <span className="deck-counter-sep">/</span>
          <span className="deck-counter-total">{slides.length}</span>
        </span>
        <div className="deck-progress-bar">
          <div className="deck-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {hasQuiz && score.answered > 0 ? (
          <span className="deck-score">
            Score: {score.correct}/{score.answered}
            {totalQuestions > 0 && ` of ${totalQuestions}`}
          </span>
        ) : (
          <span className="deck-slide-label" title={slide.heading}>
            {slide.heading.length > 35 ? slide.heading.slice(0, 35) + '...' : slide.heading}
          </span>
        )}
      </div>

      {/* Card stack */}
      <div
        className="swipe-deck"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={() => isDragging && handlePointerUp()}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        {currentIndex + 2 < slides.length && (
          <div className="deck-card deck-card-behind deck-card-behind-2" />
        )}
        {currentIndex + 1 < slides.length && (
          <div className="deck-card deck-card-behind deck-card-behind-1" />
        )}

        <div
          className={`deck-card deck-card-active ${isDragging ? 'dragging' : ''} ${isDragging && dragOffset < -30 ? 'swiping-left' : ''} ${isDragging && dragOffset > 30 ? 'swiping-right' : ''}`}
          style={{
            transform: cardTransform,
            transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div className="deck-card-header">
            <span className="deck-card-num">{currentIndex + 1}</span>
            <span className="deck-card-heading">{slide.heading}</span>
          </div>

          {slide.type === 'quiz' ? (
            <div className="deck-card-body" key={currentIndex}>
              <QuizCard slide={slide} onAnswer={handleQuizAnswer} />
            </div>
          ) : (
            <div
              ref={cardBodyRef}
              key={currentIndex}
              className="deck-card-body article-content"
              dangerouslySetInnerHTML={{ __html: slide.html }}
            />
          )}

          {/* Card overlay nav arrows */}
          {currentIndex > 0 && (
            <button className="deck-card-arrow deck-card-arrow-prev" onClick={(e) => { e.stopPropagation(); goPrev(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
          )}
          {currentIndex < slides.length - 1 && (
            <button className="deck-card-arrow deck-card-arrow-next" onClick={(e) => { e.stopPropagation(); goNext(); }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          )}

          {isDragging && dragOffset > 30 && (
            <div className="deck-hint deck-hint-prev" style={{ opacity: Math.min(dragOffset / 80, 1) }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
              Prev
            </div>
          )}
          {isDragging && dragOffset < -30 && (
            <div className="deck-hint deck-hint-next" style={{ opacity: Math.min(-dragOffset / 80, 1) }}>
              Next
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav - arrows + counter centered */}
      <div className="deck-nav">
        <button className="deck-nav-btn" onClick={goPrev} disabled={currentIndex === 0}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <span className="deck-nav-counter">
          {currentIndex + 1} / {slides.length}
        </span>
        <button className="deck-nav-btn" onClick={goNext} disabled={currentIndex >= slides.length - 1}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>
    </div>
  )
}
