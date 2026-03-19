const STORAGE_KEY = 'believer_blog_spaced'

// Spaced repetition intervals in days
const INTERVALS = [1, 3, 7, 14, 30]

function isValidEntry(entry) {
  return (
    entry &&
    typeof entry === 'object' &&
    typeof entry.completedAt === 'string' &&
    typeof entry.intervalIndex === 'number' &&
    typeof entry.nextReviewAt === 'string' &&
    !isNaN(new Date(entry.nextReviewAt).getTime())
  )
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
    // Validate entries
    const clean = {}
    for (const [slug, entry] of Object.entries(data)) {
      if (isValidEntry(entry)) {
        clean[slug] = entry
      }
    }
    return clean
  } catch {
    return {}
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Record that an article was completed (enters spaced repetition).
 * If already tracked, does nothing (use markRevised to advance).
 */
export function recordCompletion(slug) {
  const data = loadData()
  if (data[slug]) return // already tracked
  data[slug] = {
    completedAt: new Date().toISOString(),
    intervalIndex: 0,
    lastReviewedAt: new Date().toISOString(),
    nextReviewAt: addDays(new Date(), INTERVALS[0]).toISOString(),
  }
  saveData(data)
}

/**
 * Returns articles due for revision today (or overdue).
 * Returns array of { slug, nextReviewAt, intervalIndex }
 */
export function getRevisionDue() {
  const data = loadData()
  const now = new Date()
  now.setHours(23, 59, 59, 999) // include all of today
  const due = []
  for (const [slug, entry] of Object.entries(data)) {
    if (new Date(entry.nextReviewAt) <= now) {
      due.push({ slug, ...entry })
    }
  }
  due.sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt))
  return due
}

/**
 * Mark an article as revised; advance to the next interval.
 */
export function markRevised(slug) {
  const data = loadData()
  if (!data[slug]) return
  const entry = data[slug]
  const nextIndex = Math.min(entry.intervalIndex + 1, INTERVALS.length - 1)
  const interval = INTERVALS[nextIndex]
  entry.intervalIndex = nextIndex
  entry.lastReviewedAt = new Date().toISOString()
  entry.nextReviewAt = addDays(new Date(), interval).toISOString()
  saveData(data)
}

/**
 * Returns the full revision schedule: all tracked articles with their next review date.
 * Returns array of { slug, completedAt, lastReviewedAt, nextReviewAt, intervalIndex }
 */
export function getRevisionSchedule() {
  const data = loadData()
  return Object.entries(data).map(([slug, entry]) => ({
    slug,
    ...entry,
  }))
}

/**
 * Remove an article from spaced repetition tracking.
 */
export function removeFromSpaced(slug) {
  const data = loadData()
  delete data[slug]
  saveData(data)
}

function addDays(date, days) {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

export { INTERVALS }
