import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { execSync, exec } from 'child_process'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ARTICLES_DIR = path.join(ROOT, 'public', 'articles')
const IMAGES_DIR = path.join(ROOT, 'public', 'images')
const ARTICLES_JSON = path.join(ARTICLES_DIR, 'articles.json')

const app = express()
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
}))
app.use(express.json({ limit: '50mb' }))

// Ensure directories exist
fs.mkdirSync(ARTICLES_DIR, { recursive: true })
fs.mkdirSync(IMAGES_DIR, { recursive: true })

function readArticlesJson() {
  try {
    return JSON.parse(fs.readFileSync(ARTICLES_JSON, 'utf-8'))
  } catch {
    return []
  }
}

function writeArticlesJson(articles) {
  fs.writeFileSync(ARTICLES_JSON, JSON.stringify(articles, null, 2) + '\n')
}

// Simple rate limiter
const rateLimit = new Map()
function rateLimiter(limit = 30, windowMs = 60000) {
  return (req, res, next) => {
    const key = req.ip
    const now = Date.now()
    const entry = rateLimit.get(key) || { count: 0, resetAt: now + windowMs }
    if (now > entry.resetAt) {
      entry.count = 0
      entry.resetAt = now + windowMs
    }
    entry.count++
    rateLimit.set(key, entry)
    if (entry.count > limit) {
      return res.status(429).json({ error: 'Too many requests. Try again later.' })
    }
    next()
  }
}

function isValidSlug(slug) {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(slug) && !slug.includes('..')
}

// ── Publish Article ──
app.post('/api/publish', rateLimiter(10), (req, res) => {
  try {
    const { slug, title, description, date, image, fullHtml } = req.body

    if (!slug || !title || !fullHtml) {
      return res.status(400).json({ error: 'Missing required fields: slug, title, fullHtml' })
    }

    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug. Use only letters, numbers, hyphens, and underscores.' })
    }

    if (fullHtml.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Article content too large (max 2MB).' })
    }

    // 1. Write HTML file
    const htmlPath = path.join(ARTICLES_DIR, `${slug}.html`)
    fs.writeFileSync(htmlPath, fullHtml)
    console.log(`[publish] Wrote ${htmlPath}`)

    // 2. Update articles.json
    const articles = readArticlesJson()
    const entry = { slug, title, description: description || title, date: date || new Date().toISOString().split('T')[0], image: image || '' }
    const existingIndex = articles.findIndex((a) => a.slug === slug)
    if (existingIndex >= 0) {
      articles[existingIndex] = entry
    } else {
      articles.push(entry)
    }
    writeArticlesJson(articles)
    console.log(`[publish] Updated articles.json`)

    res.json({ success: true, message: 'Article saved to public/articles/', slug })
  } catch (err) {
    console.error('[publish] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Upload Image ──
app.post('/api/upload-image', rateLimiter(10), (req, res) => {
  try {
    const { filename, data } = req.body

    if (!filename || !data) {
      return res.status(400).json({ error: 'Missing filename or data' })
    }

    // data is base64 data URL: "data:image/png;base64,..."
    const matches = data.match(/^data:image\/\w+;base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid image data format' })
    }

    const buffer = Buffer.from(matches[1], 'base64')

    if (buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large (max 5MB).' })
    }

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = path.join(IMAGES_DIR, safeName)
    fs.writeFileSync(filePath, buffer)
    console.log(`[upload] Saved image: ${filePath}`)

    res.json({ success: true, url: `/images/${safeName}` })
  } catch (err) {
    console.error('[upload] Error:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Build & Deploy ──
app.post('/api/deploy', rateLimiter(10), (req, res) => {
  console.log('[deploy] Starting build & deploy...')

  exec('npm run build && firebase deploy', { cwd: ROOT, timeout: 120000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[deploy] Failed:', stderr || err.message)
      return res.status(500).json({ error: stderr || err.message, stdout })
    }
    console.log('[deploy] Success!')
    console.log(stdout)
    res.json({ success: true, message: 'Build & deploy complete!', output: stdout })
  })
})

// ── Delete Article ──
app.delete('/api/articles/:slug', rateLimiter(10), (req, res) => {
  try {
    const { slug } = req.params

    if (!isValidSlug(slug)) {
      return res.status(400).json({ error: 'Invalid slug.' })
    }

    const htmlPath = path.join(ARTICLES_DIR, `${slug}.html`)

    if (fs.existsSync(htmlPath)) {
      fs.unlinkSync(htmlPath)
    }

    const articles = readArticlesJson().filter((a) => a.slug !== slug)
    writeArticlesJson(articles)

    console.log(`[delete] Removed article: ${slug}`)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── List Articles (from filesystem) ──
app.get('/api/articles', (req, res) => {
  res.json(readArticlesJson())
})

const PORT = 3001
app.listen(PORT, () => {
  console.log(`\n  Publish server running at http://localhost:${PORT}`)
  console.log(`  Endpoints:`)
  console.log(`    POST /api/publish       - Save article to public/articles/`)
  console.log(`    POST /api/upload-image   - Upload image to public/images/`)
  console.log(`    POST /api/deploy         - Build & deploy to Firebase`)
  console.log(`    DELETE /api/articles/:slug - Delete an article`)
  console.log(`    GET /api/articles        - List all articles\n`)
})
