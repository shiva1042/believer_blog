const ARTICLES_KEY = 'believer_blog_articles'

export function getLocalArticles() {
  try {
    const data = localStorage.getItem(ARTICLES_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

export function saveLocalArticle(article) {
  const articles = getLocalArticles()
  const index = articles.findIndex((a) => a.slug === article.slug)
  if (index >= 0) {
    articles[index] = article
  } else {
    articles.push(article)
  }
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles))
}

export function deleteLocalArticle(slug) {
  const articles = getLocalArticles().filter((a) => a.slug !== slug)
  localStorage.setItem(ARTICLES_KEY, JSON.stringify(articles))
}

export function getLocalArticle(slug) {
  return getLocalArticles().find((a) => a.slug === slug) || null
}

export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function downloadFile(filename, content, type = 'text/html') {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
