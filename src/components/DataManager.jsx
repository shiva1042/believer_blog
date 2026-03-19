import { useState, useRef } from 'react'
import './DataManager.css'

const BACKUP_PREFIXES = [
  'believer_blog_progress_',
  'believer_blog_analytics',
  'believer_blog_spaced',
  'believer_blog_notes_',
  'believer_blog_study_time',
  'believer_blog_streak',
  'believer_blog_scroll_',
  'believer_blog_quiz_',
]

function collectData() {
  const data = {}
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (BACKUP_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      try {
        data[key] = JSON.parse(localStorage.getItem(key))
      } catch {
        data[key] = localStorage.getItem(key)
      }
    }
  }
  return data
}

function formatDate(dateStr) {
  if (!dateStr) return 'Never'
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function DataManager() {
  const [lastBackup, setLastBackup] = useState(() => localStorage.getItem('believer_blog_last_backup'))
  const [importStatus, setImportStatus] = useState(null)
  const fileRef = useRef(null)

  const handleExport = () => {
    const data = collectData()
    const dateStr = new Date().toISOString().slice(0, 10)
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gate-study-backup-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    const now = new Date().toISOString()
    localStorage.setItem('believer_blog_last_backup', now)
    setLastBackup(now)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result)
        if (!window.confirm(`This will overwrite your current study data with ${Object.keys(data).length} items from the backup. Continue?`)) {
          return
        }
        let count = 0
        for (const [key, value] of Object.entries(data)) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
          count++
        }
        setImportStatus(`Restored ${count} items successfully. Refreshing...`)
        setTimeout(() => window.location.reload(), 1500)
      } catch {
        setImportStatus('Error: Invalid backup file.')
      }
    }
    reader.readAsText(file)
    // Reset file input
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="data-manager">
      <h2 className="data-manager-title">Backup &amp; Restore</h2>
      <p className="data-manager-desc">
        Export your progress, notes, and study data as a JSON file, or restore from a previous backup.
      </p>
      <div className="data-manager-actions">
        <button className="dm-btn dm-btn-export" onClick={handleExport}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Data
        </button>
        <label className="dm-btn dm-btn-import">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import Data
          <input type="file" accept=".json" ref={fileRef} onChange={handleImport} hidden />
        </label>
      </div>
      {lastBackup && (
        <p className="data-manager-last">Last backup: {formatDate(lastBackup)}</p>
      )}
      {importStatus && (
        <p className={`data-manager-status ${importStatus.startsWith('Error') ? 'error' : 'success'}`}>
          {importStatus}
        </p>
      )}
    </div>
  )
}
