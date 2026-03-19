import { useState, useEffect, useCallback } from 'react'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import './Flashcards.css'

const STORAGE_KEY = 'flashcard-progress'

function fisherYatesShuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveProgress(deckId, known, total) {
  const progress = getProgress()
  progress[deckId] = { known, total, lastStudied: Date.now() }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
}

// ─── Deck Selection Screen ────────────────────────────────────────
function DeckSelection({ decks, onSelect }) {
  const progress = getProgress()

  return (
    <div className="flashcards-page">
      <div className="flashcards-header">
        <h1 className="flashcards-title">Flashcard Study Mode</h1>
        <p className="flashcards-subtitle">
          {decks.length} decks, {decks.reduce((s, d) => s + d.cards.length, 0)} cards total. Click a deck to start studying.
        </p>
      </div>
      <div className="deck-grid">
        {decks.map((deck) => {
          const p = progress[deck.id]
          const pct = p ? Math.round((p.known / p.total) * 100) : 0
          return (
            <div
              key={deck.id}
              className="deck-card"
              onClick={() => onSelect(deck)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(deck)}
            >
              <div className="deck-card-section">{deck.section}</div>
              <div className="deck-card-name">{deck.name}</div>
              <div className="deck-card-meta">
                <span className="deck-card-count">{deck.cards.length} cards</span>
                {p && (
                  <span className="deck-card-progress">
                    <span className="deck-progress-bar">
                      <span
                        className="deck-progress-fill"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span>{pct}%</span>
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Results Screen ───────────────────────────────────────────────
function ResultsScreen({ deck, knownCards, reviewCards, onRetry, onReset, onBack }) {
  const total = knownCards.length + reviewCards.length
  const pct = total > 0 ? Math.round((knownCards.length / total) * 100) : 0

  useEffect(() => {
    saveProgress(deck.id, knownCards.length, total)
  }, [deck.id, knownCards.length, total])

  return (
    <div className="flashcards-page">
      <div className="results-screen">
        <h2 className="results-title">Session Complete!</h2>
        <p className="results-subtitle">{deck.name}</p>

        <div className="results-stats">
          <div className="result-stat">
            <span className="result-stat-number known">{knownCards.length}</span>
            <span className="result-stat-label">Known</span>
          </div>
          <div className="result-stat">
            <span className="result-stat-number review">{reviewCards.length}</span>
            <span className="result-stat-label">Need Review</span>
          </div>
        </div>

        <div className="results-bar">
          <div className="results-bar-fill" style={{ width: `${pct}%` }} />
        </div>

        <div className="results-actions">
          {reviewCards.length > 0 && (
            <button className="results-btn results-btn-retry" onClick={onRetry}>
              Retry {reviewCards.length} card{reviewCards.length !== 1 ? 's' : ''} to review
            </button>
          )}
          <button className="results-btn results-btn-reset" onClick={onReset}>
            Study entire deck again
          </button>
          <button className="results-btn results-btn-back" onClick={onBack}>
            Back to all decks
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Study Screen ─────────────────────────────────────────────────
function StudyScreen({ deck, cards, onFinish, onBack }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [knownCards, setKnownCards] = useState([])
  const [reviewCards, setReviewCards] = useState([])
  const [done, setDone] = useState(false)

  const currentCard = cards[index]
  const total = cards.length

  const advance = useCallback(
    (knew) => {
      if (knew) {
        setKnownCards((prev) => [...prev, currentCard])
      } else {
        setReviewCards((prev) => [...prev, currentCard])
      }
      setFlipped(false)

      if (index + 1 >= total) {
        // Use a small timeout so the flip resets before showing results
        setTimeout(() => setDone(true), 150)
      } else {
        setTimeout(() => setIndex((i) => i + 1), 150)
      }
    },
    [currentCard, index, total]
  )

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e) {
      if (done) return
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        setFlipped((f) => !f)
      } else if (e.key === 'ArrowRight' || e.key === '1') {
        advance(true)
      } else if (e.key === 'ArrowLeft' || e.key === '2') {
        advance(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [done, advance])

  if (done) {
    return (
      <ResultsScreen
        deck={deck}
        knownCards={knownCards}
        reviewCards={reviewCards}
        onRetry={() => onFinish(reviewCards)}
        onReset={() => onFinish(null)}
        onBack={onBack}
      />
    )
  }

  const progressPct = ((index) / total) * 100

  return (
    <div className="flashcards-page">
      <div className="study-mode">
        <div className="study-top-bar">
          <button className="study-back-btn" onClick={onBack}>
            &larr; Decks
          </button>
          <span className="study-deck-name">{deck.name}</span>
          <span className="study-progress-text">
            Card {index + 1} of {total}
          </span>
        </div>

        <div className="study-progress-bar">
          <div className="study-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>

        <div className="flashcard-container" onClick={() => setFlipped((f) => !f)}>
          <div className={`flashcard${flipped ? ' flipped' : ''}`}>
            <div className="flashcard-face flashcard-front">
              <span className="flashcard-label">Question</span>
              <span className="flashcard-text">{currentCard.front}</span>
              <span className="flashcard-hint">Click to reveal answer</span>
            </div>
            <div className="flashcard-face flashcard-back">
              <span className="flashcard-label">Answer</span>
              <span className="flashcard-text">{currentCard.back}</span>
              <span className="flashcard-hint">Click to see question</span>
            </div>
          </div>
        </div>

        <div className="study-actions">
          <button className="study-btn study-btn-again" onClick={() => advance(false)}>
            Study again &#x2717;
          </button>
          <button className="study-btn study-btn-know" onClick={() => advance(true)}>
            Know it &#x2713;
          </button>
        </div>

        <div className="study-piles">
          <span className="pile-know">Known: {knownCards.length}</span>
          <span className="pile-again">Review: {reviewCards.length}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Flashcards Component ────────────────────────────────────
export default function Flashcards() {
  useDocumentTitle('Flashcards')

  const [decks, setDecks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeDeck, setActiveDeck] = useState(null)
  const [studyCards, setStudyCards] = useState(null)

  useEffect(() => {
    fetch('/articles/flashcards.json')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load flashcards')
        return res.json()
      })
      .then((data) => {
        setDecks(data)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  function startDeck(deck) {
    setActiveDeck(deck)
    // Shuffle cards for variety
    const shuffled = fisherYatesShuffle(deck.cards)
    setStudyCards(shuffled)
  }

  function handleFinish(retryCards) {
    if (retryCards) {
      // Retry only the "don't know" pile
      const shuffled = fisherYatesShuffle(retryCards)
      setStudyCards(shuffled)
    } else {
      // Full deck reset
      startDeck(activeDeck)
    }
  }

  function handleBackToDecks() {
    setActiveDeck(null)
    setStudyCards(null)
  }

  if (loading) {
    return (
      <div className="flashcards-page">
        <p style={{ textAlign: 'center', color: 'var(--color-text-light)', padding: '4rem 0' }}>
          Loading flashcards...
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flashcards-page">
        <p style={{ textAlign: 'center', color: '#dc2626', padding: '4rem 0' }}>
          Error: {error}
        </p>
      </div>
    )
  }

  if (activeDeck && studyCards) {
    return (
      <StudyScreen
        key={studyCards.length + '-' + Date.now()}
        deck={activeDeck}
        cards={studyCards}
        onFinish={handleFinish}
        onBack={handleBackToDecks}
      />
    )
  }

  return <DeckSelection decks={decks} onSelect={startDeck} />
}
