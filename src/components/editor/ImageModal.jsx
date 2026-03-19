import { useState, useRef } from 'react'
import './ImageModal.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function ImageModal({ onInsert, onClose }) {
  const [mode, setMode] = useState('url')
  const [url, setUrl] = useState('')
  const [alt, setAlt] = useState('')
  const [preview, setPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const fileRef = useRef(null)
  const fileDataRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAlt(file.name.replace(/\.[^.]+$/, ''))
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setPreview(dataUrl)
      fileDataRef.current = { filename: file.name, data: dataUrl }
      // Auto-upload to server
      uploadToServer(file.name, dataUrl)
    }
    reader.readAsDataURL(file)
  }

  async function uploadToServer(filename, data) {
    setUploading(true)
    setUploadStatus('')
    try {
      const res = await fetch(`${API}/api/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, data }),
      })
      const result = await res.json()
      if (res.ok) {
        setUrl(result.url)
        setUploadStatus(`Saved to ${result.url}`)
      } else {
        // Fall back to base64
        setUrl(data)
        setUploadStatus('Server not running — using embedded image')
      }
    } catch {
      // Fall back to base64
      setUrl(data)
      setUploadStatus('Server not running — using embedded image')
    } finally {
      setUploading(false)
    }
  }

  function handleInsert() {
    if (!url) return
    onInsert(url, alt || 'image')
  }

  return (
    <div className="img-modal-overlay" onClick={onClose}>
      <div className="img-modal" onClick={(e) => e.stopPropagation()}>
        <div className="img-header">
          <span className="img-title">Insert Image</span>
          <button className="img-close" onClick={onClose}>&times;</button>
        </div>

        <div className="img-tabs">
          <button className={`img-tab ${mode === 'url' ? 'active' : ''}`} onClick={() => setMode('url')}>
            From URL
          </button>
          <button className={`img-tab ${mode === 'upload' ? 'active' : ''}`} onClick={() => setMode('upload')}>
            Upload File
          </button>
        </div>

        <div className="img-body">
          {mode === 'url' ? (
            <div className="img-field">
              <label>Image URL</label>
              <input
                type="text"
                placeholder="https://example.com/image.png or /images/photo.jpg"
                value={url}
                onChange={(e) => { setUrl(e.target.value); setPreview(e.target.value) }}
                className="img-input"
              />
            </div>
          ) : (
            <div className="img-field">
              <label>Choose File</label>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="img-file-input"
              />
              {uploading && <p className="img-hint">Uploading to public/images/...</p>}
              {uploadStatus && <p className="img-hint img-upload-status">{uploadStatus}</p>}
            </div>
          )}

          <div className="img-field">
            <label>Alt Text</label>
            <input
              type="text"
              placeholder="Describe the image..."
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
              className="img-input"
            />
          </div>

          {preview && (
            <div className="img-preview-wrap">
              <label>Preview</label>
              <div className="img-preview">
                <img src={preview} alt={alt} onError={() => setPreview('')} />
              </div>
            </div>
          )}
        </div>

        <div className="img-footer">
          <button className="img-btn cancel" onClick={onClose}>Cancel</button>
          <button className="img-btn insert" onClick={handleInsert} disabled={!url || uploading}>
            {uploading ? 'Uploading...' : 'Insert Image'}
          </button>
        </div>
      </div>
    </div>
  )
}
