const STORAGE_KEY = 'believer_blog_progress'

const STATUSES = ['unmarked', 'in-progress', 'completed', 'revision-needed']

function loadAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const data = JSON.parse(raw)
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {}
    // Validate: all values must be valid statuses
    const clean = {}
    for (const [slug, status] of Object.entries(data)) {
      if (STATUSES.includes(status)) {
        clean[slug] = status
      }
    }
    return clean
  } catch {
    return {}
  }
}

function saveAll(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getProgress(slug) {
  const all = loadAll()
  return all[slug] || 'unmarked'
}

export function setProgress(slug, status) {
  const all = loadAll()
  if (status === 'unmarked') {
    delete all[slug]
  } else {
    all[slug] = status
  }
  saveAll(all)
}

export function getAllProgress() {
  return loadAll()
}

export function getStats() {
  const all = loadAll()
  const values = Object.values(all)
  return {
    total: 0, // caller should set this from articles.json length
    completed: values.filter((v) => v === 'completed').length,
    inProgress: values.filter((v) => v === 'in-progress').length,
    revisionNeeded: values.filter((v) => v === 'revision-needed').length,
  }
}

export function cycleStatus(current) {
  const idx = STATUSES.indexOf(current)
  return STATUSES[(idx + 1) % STATUSES.length]
}

export { STATUSES }
