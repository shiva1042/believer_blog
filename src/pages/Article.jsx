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
import DOMPurify from 'dompurify'
import { recordActivity } from '../utils/streak.js'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import './Article.css'

mermaid.initialize({ startOnLoad: false, theme: 'default' })

// Sanitize HTML while preserving quiz data scripts (type="application/json")
function sanitizeArticleHtml(rawHtml) {
  // Extract quiz scripts before sanitizing
  const quizScripts = []
  const stripped = rawHtml.replace(/<script\s+class="quiz-data"\s+type="application\/json">([\s\S]*?)<\/script>/gi, (match, content) => {
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
    if (!loading && !error && contentRef.current) {
      const mermaidDivs = contentRef.current.querySelectorAll('.mermaid')
      if (mermaidDivs.length > 0) {
        mermaidDivs.forEach((div) => {
          div.removeAttribute('data-processed')
        })
        mermaid.run({ nodes: mermaidDivs })
      }
    }
  }, [html, loading, error])

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

  return (
    <>
      <ReadingProgress />
      <div className="article-page-wrapper">
        <TableOfContents contentRef={contentRef} />
        <div className="article-page">
          <div className="article-top-bar">
            <Link to="/" className="back-link">&larr; Back to Home</Link>
            <div className="article-top-bar-right">
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
          <div
            ref={contentRef}
            className="article-content"
            dangerouslySetInnerHTML={{ __html: sanitizeArticleHtml(html) }}
          />
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
