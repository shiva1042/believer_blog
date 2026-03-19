import { useState, useEffect } from 'react'
import './ReadingProgress.css'

export default function ReadingProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      if (docHeight > 0) {
        setProgress(Math.min((scrollTop / docHeight) * 100, 100))
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="reading-progress" role="progressbar" aria-valuenow={Math.round(progress)}>
      <div className="reading-progress-bar" style={{ width: `${progress}%` }} />
    </div>
  )
}
