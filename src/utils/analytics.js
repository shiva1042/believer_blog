const STORAGE_KEY = 'believer_blog_analytics'

function loadAttempts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistAttempts(attempts) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(attempts))
}

export function saveAttempt(attempt) {
  const attempts = loadAttempts()
  const record = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    slug: attempt.slug || '',
    title: attempt.title || 'Untitled Quiz',
    section: attempt.section || 'Unknown',
    date: attempt.date || new Date().toISOString(),
    totalQuestions: attempt.totalQuestions || 0,
    correctAnswers: attempt.correctAnswers || 0,
    score: attempt.totalQuestions > 0
      ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
      : 0,
    timeSpent: attempt.timeSpent || 0,
    sectionBreakdown: attempt.sectionBreakdown || {},
    wrongQuestions: attempt.wrongQuestions || [],
  }
  attempts.push(record)
  persistAttempts(attempts)
  return record
}

export function getAttempts() {
  return loadAttempts()
}

export function getAttemptsBySlug(slug) {
  return loadAttempts().filter((a) => a.slug === slug)
}

export function getStats() {
  const attempts = loadAttempts()
  if (attempts.length === 0) {
    return { totalAttempts: 0, avgScore: 0, bestScore: 0, totalQuestions: 0, totalCorrect: 0 }
  }
  const totalAttempts = attempts.length
  const totalQuestions = attempts.reduce((s, a) => s + a.totalQuestions, 0)
  const totalCorrect = attempts.reduce((s, a) => s + a.correctAnswers, 0)
  const avgScore = Math.round(attempts.reduce((s, a) => s + a.score, 0) / totalAttempts)
  const bestScore = Math.max(...attempts.map((a) => a.score))
  return { totalAttempts, avgScore, bestScore, totalQuestions, totalCorrect }
}

export function getSectionStats() {
  const attempts = loadAttempts()
  const sections = {}
  attempts.forEach((a) => {
    // Use top-level section as a bucket
    const sec = a.section || 'Unknown'
    if (!sections[sec]) sections[sec] = { total: 0, correct: 0 }
    sections[sec].total += a.totalQuestions
    sections[sec].correct += a.correctAnswers

    // Also merge per-question sectionBreakdown if provided
    if (a.sectionBreakdown) {
      Object.entries(a.sectionBreakdown).forEach(([name, data]) => {
        if (!sections[name]) sections[name] = { total: 0, correct: 0 }
        sections[name].total += data.total
        sections[name].correct += data.correct
      })
    }
  })
  // Add accuracy
  Object.keys(sections).forEach((k) => {
    const s = sections[k]
    s.accuracy = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0
  })
  return sections
}

export function getWeakSections() {
  const sectionStats = getSectionStats()
  return Object.entries(sectionStats)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => a.accuracy - b.accuracy)
}

export function getScoreTrend() {
  const attempts = loadAttempts()
  return attempts.map((a) => ({
    date: a.date,
    score: a.score,
    title: a.title,
  }))
}

export function clearAnalytics() {
  localStorage.removeItem(STORAGE_KEY)
}
