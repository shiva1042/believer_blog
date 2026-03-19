import { useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import EditorToolbar from '../components/editor/EditorToolbar.jsx'
import EmojiPicker from '../components/editor/EmojiPicker.jsx'
import IconPicker from '../components/editor/IconPicker.jsx'
import MermaidModal from '../components/editor/MermaidModal.jsx'
import ImageModal from '../components/editor/ImageModal.jsx'
import { slugify, saveLocalArticle, getLocalArticle } from '../utils/storage.js'
import useDocumentTitle from '../utils/useDocumentTitle.js'
import './Editor.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function Editor() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editSlug = searchParams.get('edit')

  useDocumentTitle(editSlug ? 'Edit Article' : 'New Article')

  const existing = editSlug ? getLocalArticle(editSlug) : null

  const [title, setTitle] = useState(existing?.title || '')
  const [description, setDescription] = useState(existing?.description || '')
  const [coverImage, setCoverImage] = useState(existing?.image || '')
  const [showEmoji, setShowEmoji] = useState(false)
  const [showIcon, setShowIcon] = useState(false)
  const [showMermaid, setShowMermaid] = useState(false)
  const [showImage, setShowImage] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [deploying, setDeploying] = useState(false)
  const [publishResult, setPublishResult] = useState(null) // { success, slug, message }
  const [deployResult, setDeployResult] = useState(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4] },
      }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Placeholder.configure({ placeholder: 'Start writing your article...' }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: false }),
    ],
    content: existing?.html || '',
  })

  const handleEmojiSelect = useCallback((emoji) => {
    editor?.chain().focus().insertContent(emoji).run()
    setShowEmoji(false)
  }, [editor])

  const handleIconSelect = useCallback((svgHtml) => {
    editor?.chain().focus().insertContent(svgHtml).run()
    setShowIcon(false)
  }, [editor])

  const handleMermaidInsert = useCallback((diagramHtml) => {
    editor?.chain().focus().insertContent(diagramHtml).run()
    setShowMermaid(false)
  }, [editor])

  const handleImageInsert = useCallback((src, alt) => {
    editor?.chain().focus().setImage({ src, alt }).run()
    setShowImage(false)
  }, [editor])

  function buildArticleData() {
    const slug = editSlug || slugify(title)
    const html = editor.getHTML()
    const now = new Date().toISOString().split('T')[0]
    const heroImg = coverImage
      ? `<img src="${coverImage}" alt="${title}" class="article-hero" />\n  `
      : ''
    const fullHtml = `<article>\n  <h1>${title}</h1>\n  ${heroImg}${html}\n</article>`

    return {
      slug,
      title,
      description: description || title,
      date: existing?.date || now,
      image: coverImage,
      html,
      fullHtml,
    }
  }

  async function handlePublish() {
    if (!title.trim()) {
      alert('Please enter an article title.')
      return
    }
    if (!editor?.getHTML() || editor.getHTML() === '<p></p>') {
      alert('Please write some content before publishing.')
      return
    }

    setPublishing(true)
    setPublishResult(null)
    setDeployResult(null)

    const data = buildArticleData()

    // Also save to localStorage as backup
    saveLocalArticle({ ...data, source: 'editor' })

    try {
      const res = await fetch(`${API}/api/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()

      if (res.ok) {
        setPublishResult({ success: true, slug: data.slug, message: 'Article saved to public/articles/ and articles.json updated.' })
      } else {
        setPublishResult({ success: false, slug: data.slug, message: result.error || 'Publish failed.' })
      }
    } catch (err) {
      setPublishResult({
        success: false,
        slug: data.slug,
        message: `Cannot reach publish server. Make sure you started with "npm run dev" (runs both Vite + server). Error: ${err.message}`,
      })
    } finally {
      setPublishing(false)
    }
  }

  async function handleDeploy() {
    setDeploying(true)
    setDeployResult(null)

    try {
      const res = await fetch(`${API}/api/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const result = await res.json()

      if (res.ok) {
        setDeployResult({ success: true, message: 'Build & deploy to Firebase complete!', output: result.output })
      } else {
        setDeployResult({ success: false, message: result.error || 'Deploy failed.' })
      }
    } catch (err) {
      setDeployResult({ success: false, message: `Deploy request failed: ${err.message}` })
    } finally {
      setDeploying(false)
    }
  }

  if (publishResult?.success) {
    return (
      <div className="editor-published">
        <div className="published-card">
          <div className="published-icon">✓</div>
          <h2>Article Published!</h2>
          <p className="publish-msg">
            <strong>{title}</strong> has been saved to <code>public/articles/{publishResult.slug}.html</code> and <code>articles.json</code> has been updated.
          </p>

          <div className="published-actions">
            <button className="pub-btn primary" onClick={() => navigate(`/article/${publishResult.slug}`)}>
              View Article
            </button>
            <button className="pub-btn" onClick={() => navigate('/')}>
              Go to Home
            </button>
            <button className="pub-btn" onClick={() => { setPublishResult(null); setDeployResult(null) }}>
              Continue Editing
            </button>
          </div>

          <div className="published-deploy">
            <h3>Deploy to Firebase</h3>
            <p>Your article is saved locally. Click below to build and deploy to Firebase Hosting in one click.</p>

            <button
              className={`deploy-big-btn ${deploying ? 'deploying' : ''}`}
              onClick={handleDeploy}
              disabled={deploying}
            >
              {deploying ? (
                <>
                  <span className="spinner" />
                  Building & Deploying...
                </>
              ) : (
                '🚀 Build & Deploy to Firebase'
              )}
            </button>

            {deployResult && (
              <div className={`deploy-result ${deployResult.success ? 'success' : 'error'}`}>
                <strong>{deployResult.success ? '✓ Deployed!' : '✗ Deploy Failed'}</strong>
                <p>{deployResult.message}</p>
                {deployResult.output && (
                  <details>
                    <summary>Build output</summary>
                    <pre>{deployResult.output}</pre>
                  </details>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="editor-page">
      <div className="editor-meta">
        <h1 className="editor-page-title">{editSlug ? 'Edit Article' : 'New Article'}</h1>

        <div className="meta-field">
          <label htmlFor="editor-title">Title</label>
          <input
            id="editor-title"
            type="text"
            className="meta-input title-input"
            placeholder="Article title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="meta-row">
          <div className="meta-field">
            <label htmlFor="editor-desc">Short Description</label>
            <input
              id="editor-desc"
              type="text"
              className="meta-input"
              placeholder="Brief description for the card..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="meta-field">
            <label htmlFor="editor-cover">Cover Image URL</label>
            <input
              id="editor-cover"
              type="text"
              className="meta-input"
              placeholder="/images/cover.jpg"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
            />
          </div>
        </div>

        {title && (
          <div className="meta-slug">
            Slug: <code>{editSlug || slugify(title)}</code>
          </div>
        )}
      </div>

      <EditorToolbar
        editor={editor}
        onOpenEmoji={() => setShowEmoji(true)}
        onOpenIcon={() => setShowIcon(true)}
        onOpenMermaid={() => setShowMermaid(true)}
        onOpenImage={() => setShowImage(true)}
      />

      <div className="editor-content-wrapper">
        <EditorContent editor={editor} className="editor-content" />
      </div>

      <div className="editor-actions">
        <button className="action-btn secondary" onClick={() => navigate('/')}>
          Cancel
        </button>
        <button className="action-btn primary" onClick={handlePublish} disabled={publishing}>
          {publishing ? 'Publishing...' : 'Publish Article'}
        </button>
      </div>

      {publishResult && !publishResult.success && (
        <div className="publish-error">
          <strong>Publish Error:</strong> {publishResult.message}
        </div>
      )}

      {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
      {showIcon && <IconPicker onSelect={handleIconSelect} onClose={() => setShowIcon(false)} />}
      {showMermaid && <MermaidModal onInsert={handleMermaidInsert} onClose={() => setShowMermaid(false)} />}
      {showImage && <ImageModal onInsert={handleImageInsert} onClose={() => setShowImage(false)} />}
    </div>
  )
}
