import { useState, useEffect } from 'react'
import { getStreak } from '../utils/streak.js'
import './StudyStreak.css'

export default function StudyStreak() {
  const [streak, setStreak] = useState(null)

  useEffect(() => {
    setStreak(getStreak())
  }, [])

  if (!streak || streak.totalDays === 0) return null

  return (
    <div className="study-streak">
      <div className="streak-main">
        <span className="streak-fire" role="img" aria-label="fire">&#128293;</span>
        <span className="streak-count">{streak.currentStreak}</span>
        <span className="streak-label">day streak</span>
      </div>
      <div className="streak-details">
        <div className="streak-stat">
          <span className="streak-stat-value">{streak.longestStreak}</span>
          <span className="streak-stat-label">Longest</span>
        </div>
        <div className="streak-divider" />
        <div className="streak-stat">
          <span className="streak-stat-value">{streak.totalDays}</span>
          <span className="streak-stat-label">Total days</span>
        </div>
      </div>
    </div>
  )
}
