let cachedPool = null

/**
 * Fetches articles.json, then fetches each article HTML,
 * parses <script class="quiz-data"> tags, and builds a flat pool of questions.
 */
export async function loadAllQuizzes() {
  if (cachedPool) return cachedPool

  const res = await fetch('/articles/articles.json')
  const articles = await res.json()

  const pool = []
  let globalId = 0

  const fetches = articles.map(async (article) => {
    try {
      const htmlRes = await fetch(`/articles/${article.slug}.html`)
      const html = await htmlRes.text()

      const parser = new DOMParser()
      const doc = parser.parseFromString(html, 'text/html')
      const scripts = doc.querySelectorAll('script.quiz-data')

      scripts.forEach((script) => {
        try {
          const data = JSON.parse(script.textContent)
          if (data.questions && Array.isArray(data.questions)) {
            data.questions.forEach((q, idx) => {
              pool.push({
                id: `${article.slug}__q${globalId++}`,
                question: q.question,
                options: q.options,
                answer: q.answer,
                explanation: q.explanation || '',
                sourceSlug: article.slug,
                sourceTitle: article.title,
                sourceSection: article.section,
              })
            })
          }
        } catch (_) {
          // skip malformed quiz data
        }
      })
    } catch (_) {
      // skip articles that fail to load
    }
  })

  await Promise.all(fetches)

  cachedPool = pool
  return pool
}

/**
 * Picks a random unanswered question from the pool.
 * Returns null if all have been answered.
 */
export function getRandomQuestion(pool, answeredIds, sectionFilter) {
  let candidates = pool.filter((q) => !answeredIds.has(q.id))
  if (sectionFilter && sectionFilter !== 'All Sections') {
    candidates = candidates.filter((q) => q.sourceSection === sectionFilter)
  }
  if (candidates.length === 0) return null
  const idx = Math.floor(Math.random() * candidates.length)
  return candidates[idx]
}

/**
 * Fisher-Yates shuffle (returns a new array).
 */
export function shuffleArray(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
