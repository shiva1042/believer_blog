import { useState, useEffect, useRef, useCallback } from 'react'
import './ArticleNotes.css'

const STORAGE_KEY_PREFIX = 'believer_blog_notes_'

function loadNotes(slug) {
  try {
    return localStorage.getItem(STORAGE_KEY_PREFIX + slug) || ''
  } catch {
    return ''
  }
}

function saveNotes(slug, text) {
  localStorage.setItem(STORAGE_KEY_PREFIX + slug, text)
}

export default function ArticleNotes({ slug }) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(true)
  const timerRef = useRef(null)

  useEffect(() => {
    setText(loadNotes(slug))
    setSaved(true)
  }, [slug])

  const doSave = useCallback((value) => {
    saveNotes(slug, value)
    setSaved(true)
  }, [slug])

  const handleChange = (e) => {
    const value = e.target.value
    setText(value)
    setSaved(false)
    // Auto-save after 800ms of inactivity
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => doSave(value), 800)
  }

  // Save on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [])

  // Save on blur immediately
  const handleBlur = () => {
    if (!saved) {
      if (timerRef.current) clearTimeout(timerRef.current)
      doSave(text)
    }
  }

  return (
    <div className="article-notes">
      <div className="article-notes-header">
        <h3 className="article-notes-title">Your Notes</h3>
        <span className={`article-notes-status ${saved ? 'saved' : 'unsaved'}`}>
          {saved ? 'Saved' : 'Unsaved'}
        </span>
      </div>
      <textarea
        className="article-notes-textarea"
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Write your notes for this article..."
        rows={6}
      />
      <div className="article-notes-footer">
        <span className="article-notes-count">{text.length} characters</span>
      </div>
    </div>
  )
}
