import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import mermaid from 'mermaid'
import { getLocalArticle } from '../utils/storage.js'
import TableOfContents from '../components/TableOfContents.jsx'
import ReadingProgress from '../components/ReadingProgress.jsx'
import ProgressBadge from '../components/ProgressBadge.jsx'
import Quiz from '../components/Quiz.jsx'
import ArticleNotes from '../components/ArticleNotes.jsx'
import ShareButton from '../components/ShareButton.jsx'
import SwipeDeck from '../components/SwipeDeck.jsx'
import DOMPurify from 'dompurify'
import { recordActivity } from '../utils/streak.js'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import { attachMermaidZoom } from '../utils/mermaidZoom.js'
import './Article.css'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

// Sanitize HTML while preserving quiz data scripts (type="application/json")
function sanitizeArticleHtml(rawHtml) {
  // Extract quiz scripts before sanitizing — handle both attribute orderings:
  // <script class="quiz-data" type="application/json"> AND
  // <script type="application/json" class="quiz-data">
  const quizScripts = []
  const stripped = rawHtml.replace(/<script\s+(?:class="quiz-data"\s+type="application\/json"|type="application\/json"\s+class="quiz-data")>([\s\S]*?)<\/script>/gi, (match, content) => {
    const placeholder = `<div class="quiz-data-placeholder" data-quiz-index="${quizScripts.length}"></div>`
    quizScripts.push(content)
    return placeholder
  })
  // Sanitize the rest
  let clean = DOMPurify.sanitize(stripped, { WHOLE_DOCUMENT: true })
  // Re-inject quiz data as safe JSON scripts
  quizScripts.forEach((content, i) => {
    clean = clean.replace(
      `<div class="quiz-data-placeholder" data-quiz-index="${i}"></div>`,
      `<script class="quiz-data" type="application/json">${DOMPurify.sanitize(content, { ALLOWED_TAGS: [] })}</script>`
    )
  })
  return clean
}

function calculateReadingTime(html) {
  const div = document.createElement('div')
  div.innerHTML = html
  const text = div.textContent || div.innerText || ''
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export default function Article() {
  const { slug } = useParams()
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [articles, setArticles] = useState([])
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('articleViewMode') || 'scroll')
  const contentRef = useRef(null)

  // Load articles list for navigation
  useEffect(() => {
    fetch('/articles/articles.json')
      .then((res) => res.json())
      .then(setArticles)
      .catch(() => setArticles([]))
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(false)

    // First check localStorage for editor-published articles
    const localArticle = getLocalArticle(slug)
    if (localArticle?.fullHtml) {
      setHtml(localArticle.fullHtml)
      setLoading(false)
      return
    }

    // Fall back to static HTML file
    fetch(`/articles/${slug}.html`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found')
        return res.text()
      })
      .then((text) => {
        setHtml(text)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [slug])

  useEffect(() => {
    if (!contentRef.current) return

    if (viewMode === 'swipe') {
      // Temporarily disable mermaid class on hidden scroll div so it doesn't
      // interfere with SwipeDeck's mermaid rendering (no IDs clash)
      contentRef.current.querySelectorAll('.mermaid').forEach((div) => {
        div.classList.replace('mermaid', 'mermaid-paused')
      })
      return
    }

    // Restore any paused mermaid divs when switching back to scroll
    contentRef.current.querySelectorAll('.mermaid-paused').forEach((div) => {
      div.classList.replace('mermaid-paused', 'mermaid')
    })

    if (!loading && !error) {
      const mermaidDivs = contentRef.current.querySelectorAll('.mermaid')
      if (mermaidDivs.length === 0) return

      // Reset unprocessed mermaid divs
      mermaidDivs.forEach((div) => {
        if (!div.querySelector('svg')) {
          div.removeAttribute('data-processed')
        }
      })

      const unprocessed = Array.from(mermaidDivs).filter((d) => !d.querySelector('svg'))
      if (unprocessed.length === 0) return

      mermaid.run({ nodes: unprocessed }).then(() => {
        if (contentRef.current) attachMermaidZoom(contentRef.current)
      }).catch(() => {})
    }
  }, [html, loading, error, viewMode])

  const currentArticle = useMemo(() => articles.find((a) => a.slug === slug) || null, [articles, slug])

  useDocumentTitle(currentArticle?.title)

  // Determine prev/next articles within the same section
  const { prevArticle, nextArticle } = useMemo(() => {
    const currentIndex = articles.findIndex((a) => a.slug === slug)
    if (currentIndex === -1) return { prevArticle: null, nextArticle: null }

    const currentSection = articles[currentIndex].section
    const sectionArticles = articles.filter((a) => a.section === currentSection)
    const sectionIndex = sectionArticles.findIndex((a) => a.slug === slug)

    return {
      prevArticle: sectionIndex > 0 ? sectionArticles[sectionIndex - 1] : null,
      nextArticle:
        sectionIndex < sectionArticles.length - 1
          ? sectionArticles[sectionIndex + 1]
          : null,
    }
  }, [articles, slug])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't navigate if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

      if (e.key === 'ArrowLeft' && prevArticle) {
        window.location.href = `/article/${prevArticle.slug}`
      } else if (e.key === 'ArrowRight' && nextArticle) {
        window.location.href = `/article/${nextArticle.slug}`
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [prevArticle, nextArticle])

  // Record daily streak activity
  useEffect(() => {
    recordActivity()
  }, [slug])

  // Scroll depth tracking
  const [scrollPct, setScrollPct] = useState(() => {
    const saved = localStorage.getItem(`believer_blog_scroll_${slug}`)
    return saved ? parseInt(saved, 10) : 0
  })

  useEffect(() => {
    let maxScroll = parseInt(localStorage.getItem(`believer_blog_scroll_${slug}`) || '0', 10)
    setScrollPct(maxScroll)

    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight <= 0) return
      const pct = Math.min(100, Math.round((scrollTop / docHeight) * 100))
      if (pct > maxScroll) {
        maxScroll = pct
        localStorage.setItem(`believer_blog_scroll_${slug}`, String(maxScroll))
        setScrollPct(maxScroll)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [slug])

  const readingTime = useMemo(() => {
    if (!html) return 0
    return calculateReadingTime(html)
  }, [html])

  if (loading) {
    return <div className="article-status">Loading...</div>
  }

  if (error) {
    return (
      <div className="article-status">
        <h2>Article not found</h2>
        <p>The article "{slug}" does not exist.</p>
        <Link to="/" className="back-link">&larr; Back to Home</Link>
      </div>
    )
  }

  const handleViewMode = (mode) => {
    setViewMode(mode)
    localStorage.setItem('articleViewMode', mode)
  }

  return (
    <>
      <ReadingProgress />
      <div className="article-page-wrapper">
        {viewMode === 'scroll' && <TableOfContents contentRef={contentRef} />}
        <div className="article-page">
          <div className="article-top-bar">
            <Link to="/" className="back-link">&larr; Back to Home</Link>
            <div className="article-top-bar-right">
              {/* View toggle */}
              <div className="article-view-toggle">
                <button
                  className={`article-view-btn ${viewMode === 'scroll' ? 'active' : ''}`}
                  onClick={() => handleViewMode('scroll')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
                  Scroll
                </button>
                <button
                  className={`article-view-btn ${viewMode === 'swipe' ? 'active' : ''}`}
                  onClick={() => handleViewMode('swipe')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M8 21h8" /><path d="M9 9l3 3-3 3" /></svg>
                  Cards
                </button>
              </div>
              <ShareButton title={currentArticle?.title || slug} />
              <Link to={`/editor?edit=${slug}`} className="edit-link">Edit Article</Link>
            </div>
          </div>
          <div className="article-progress-row">
            <ProgressBadge slug={slug} />
          </div>
          {readingTime > 0 && (
            <div className="reading-time">
              {readingTime} min read
              {scrollPct > 0 && <span className="scroll-pct"> &middot; Read: {scrollPct}%</span>}
            </div>
          )}

          {/* Hidden div for Quiz to find quiz-data scripts (always rendered) */}
          <div
            ref={contentRef}
            className={viewMode === 'scroll' ? 'article-content' : 'article-content-hidden'}
            style={viewMode === 'swipe' ? { position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none' } : undefined}
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(html) }}
          />

          {viewMode === 'swipe' && (
            <SwipeDeck htmlContent={sanitizeArticleHtml(html)} />
          )}

          {!loading && !error && <Quiz contentRef={contentRef} articleSlug={slug} articleSection={currentArticle?.section} />}
          <ArticleNotes slug={slug} />
          {(prevArticle || nextArticle) && (
            <div className="article-nav">
              {prevArticle ? (
                <Link to={`/article/${prevArticle.slug}`} className="nav-prev">
                  <span className="nav-label">&larr; Previous</span>
                  {prevArticle.title}
                </Link>
              ) : (
                <span />
              )}
              {nextArticle ? (
                <Link to={`/article/${nextArticle.slug}`} className="nav-next">
                  <span className="nav-label">Next &rarr;</span>
                  {nextArticle.title}
                </Link>
              ) : (
                <span />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
