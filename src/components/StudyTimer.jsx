import { useState, useEffect, useRef, useCallback } from 'react'
import './StudyTimer.css'

const STUDY_TIME = 25 * 60 // 25 minutes in seconds
const BREAK_TIME = 5 * 60  // 5 minutes in seconds
const STORAGE_KEY = 'believer_blog_study_time'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}

function getTodayStudyTime() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    return data[getTodayKey()] || 0
  } catch {
    return 0
  }
}

function addStudyTime(seconds) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const data = raw ? JSON.parse(raw) : {}
    const key = getTodayKey()
    data[key] = (data[key] || 0) + seconds
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // ignore
  }
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatStudyTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function StudyTimer() {
  const [expanded, setExpanded] = useState(false)
  const [isStudy, setIsStudy] = useState(true)
  const [timeLeft, setTimeLeft] = useState(STUDY_TIME)
  const [running, setRunning] = useState(false)
  const [todayTotal, setTodayTotal] = useState(getTodayStudyTime)
  const intervalRef = useRef(null)
  const lastTickRef = useRef(null)

  const totalTime = isStudy ? STUDY_TIME : BREAK_TIME
  const progress = ((totalTime - timeLeft) / totalTime) * 100

  const notifyEnd = useCallback((type) => {
    const msg = type === 'study' ? 'Study session complete! Take a break.' : 'Break is over! Ready to study?'
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Study Timer', { body: msg })
    }
    // Fallback: alert if notifications not available
    if (!('Notification' in window) || Notification.permission === 'denied') {
      // Use a subtle approach - just play a sound-like effect via title
      document.title = msg
      setTimeout(() => { document.title = 'Believer Blog' }, 3000)
    }
  }, [])

  useEffect(() => {
    // Request notification permission on first expand
    if (expanded && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [expanded])

  useEffect(() => {
    if (running) {
      lastTickRef.current = Date.now()
      intervalRef.current = setInterval(() => {
        const now = Date.now()
        const elapsed = Math.round((now - lastTickRef.current) / 1000)
        lastTickRef.current = now

        setTimeLeft((prev) => {
          const next = prev - elapsed
          if (next <= 0) {
            clearInterval(intervalRef.current)
            setRunning(false)
            if (isStudy) {
              addStudyTime(STUDY_TIME)
              setTodayTotal(getTodayStudyTime())
              notifyEnd('study')
              setIsStudy(false)
              return BREAK_TIME
            } else {
              notifyEnd('break')
              setIsStudy(true)
              return STUDY_TIME
            }
          }
          return next
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, isStudy, notifyEnd])

  // Track partial study time when pausing
  const handlePause = () => {
    if (running && isStudy) {
      const elapsed = totalTime - timeLeft
      if (elapsed > 0) {
        addStudyTime(elapsed)
        setTodayTotal(getTodayStudyTime())
      }
    }
    setRunning(false)
  }

  const handleReset = () => {
    setRunning(false)
    setIsStudy(true)
    setTimeLeft(STUDY_TIME)
  }

  const ringColor = isStudy ? 'var(--color-primary)' : '#22c55e'

  return (
    <div className={`study-timer ${expanded ? 'expanded' : ''}`}>
      <button
        className="study-timer-toggle"
        onClick={() => setExpanded(!expanded)}
        title="Study Timer"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {running && <span className="timer-mini">{formatTime(timeLeft)}</span>}
      </button>

      {expanded && (
        <div className="study-timer-panel">
          <div className="timer-display">
            <svg className="timer-ring" width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="var(--color-border)" strokeWidth="6" />
              <circle
                cx="60" cy="60" r="52"
                fill="none"
                stroke={ringColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                transform="rotate(-90 60 60)"
                style={{ transition: 'stroke-dashoffset 0.5s ease' }}
              />
            </svg>
            <div className="timer-text">
              <span className="timer-time">{formatTime(timeLeft)}</span>
              <span className="timer-mode">{isStudy ? 'Study' : 'Break'}</span>
            </div>
          </div>

          <div className="timer-controls">
            {!running ? (
              <button className="timer-btn timer-start" onClick={() => setRunning(true)}>
                Start
              </button>
            ) : (
              <button className="timer-btn timer-pause" onClick={handlePause}>
                Pause
              </button>
            )}
            <button className="timer-btn timer-reset" onClick={handleReset}>
              Reset
            </button>
          </div>

          <div className="timer-today">
            Today: {formatStudyTime(todayTotal)}
          </div>
        </div>
      )}
    </div>
  )
}
