let cachedIndex = null

function stripHtmlTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchInBatches(articles, batchSize = 10) {
  const results = []
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (article) => {
        try {
          const htmlRes = await fetch(`/articles/${article.slug}.html`)
          const html = await htmlRes.text()
          const textContent = stripHtmlTags(html).toLowerCase()
          return {
            slug: article.slug,
            title: article.title,
            section: article.section || '',
            description: article.description || '',
            textContent,
          }
        } catch {
          return {
            slug: article.slug,
            title: article.title,
            section: article.section || '',
            description: article.description || '',
            textContent: '',
          }
        }
      })
    )
    results.push(...batchResults)
  }
  return results
}

export async function buildSearchIndex() {
  if (cachedIndex) return cachedIndex

  const res = await fetch('/articles/articles.json')
  const articles = await res.json()

  const index = await fetchInBatches(articles, 10)

  cachedIndex = index
  return index
}

export function searchArticles(index, query) {
  if (!query || !query.trim()) return []

  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0)

  const results = []

  for (const article of index) {
    const titleLower = article.title.toLowerCase()
    const descLower = article.description.toLowerCase()
    const content = article.textContent

    const allMatch = terms.every(
      (term) =>
        titleLower.includes(term) ||
        descLower.includes(term) ||
        content.includes(term)
    )

    if (!allMatch) continue

    let matchType = 'content'
    if (terms.every((term) => titleLower.includes(term))) {
      matchType = 'title'
    } else if (terms.every((term) => descLower.includes(term))) {
      matchType = 'description'
    }

    const snippet = extractSnippet(content, terms)

    results.push({
      slug: article.slug,
      title: article.title,
      section: article.section,
      description: article.description,
      snippet,
      matchType,
    })
  }

  const priority = { title: 0, description: 1, content: 2 }
  results.sort((a, b) => priority[a.matchType] - priority[b.matchType])

  return results
}

function extractSnippet(text, terms) {
  let firstIndex = text.length
  let matchedTerm = terms[0]

  for (const term of terms) {
    const idx = text.indexOf(term)
    if (idx !== -1 && idx < firstIndex) {
      firstIndex = idx
      matchedTerm = term
    }
  }

  if (firstIndex === text.length) return ''

  const start = Math.max(0, firstIndex - 50)
  const end = Math.min(text.length, firstIndex + matchedTerm.length + 50)
  let snippet = text.slice(start, end)

  if (start > 0) snippet = '...' + snippet
  if (end < text.length) snippet = snippet + '...'

  for (const term of terms) {
    const regex = new RegExp(`(${escapeRegex(term)})`, 'gi')
    snippet = snippet.replace(regex, '<mark>$1</mark>')
  }

  return snippet
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
