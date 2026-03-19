const STORAGE_KEY = 'believer_blog_streak'

function getStreakData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { activeDates: [], longestStreak: 0 }
    return JSON.parse(raw)
  } catch {
    return { activeDates: [], longestStreak: 0 }
  }
}

function saveStreakData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function recordActivity() {
  const data = getStreakData()
  const today = todayStr()
  if (!data.activeDates.includes(today)) {
    data.activeDates.push(today)
    data.activeDates.sort()
  }
  // Recalculate longest streak
  const { currentStreak } = calcStreaks(data.activeDates)
  if (currentStreak > (data.longestStreak || 0)) {
    data.longestStreak = currentStreak
  }
  saveStreakData(data)
}

function calcStreaks(dates) {
  if (!dates || dates.length === 0) return { currentStreak: 0, longestStreak: 0 }

  const sorted = [...new Set(dates)].sort()
  const today = todayStr()
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // Current streak: count backwards from today (or yesterday if not active today)
  let currentStreak = 0
  const lastDate = sorted[sorted.length - 1]
  if (lastDate === today || lastDate === yesterday) {
    let checkDate = lastDate
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (sorted[i] === checkDate) {
        currentStreak++
        const d = new Date(checkDate)
        d.setDate(d.getDate() - 1)
        checkDate = d.toISOString().slice(0, 10)
      }
    }
  }

  // Longest streak
  let longest = 1
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = (curr - prev) / 86400000
    if (diff === 1) {
      streak++
      if (streak > longest) longest = streak
    } else if (diff > 1) {
      streak = 1
    }
  }

  return { currentStreak, longestStreak: sorted.length > 0 ? longest : 0 }
}

export function getStreak() {
  const data = getStreakData()
  const { currentStreak, longestStreak } = calcStreaks(data.activeDates)
  const storedLongest = data.longestStreak || 0
  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, storedLongest),
    lastActiveDate: data.activeDates.length > 0 ? data.activeDates[data.activeDates.length - 1] : null,
    totalDays: new Set(data.activeDates).size,
  }
}
