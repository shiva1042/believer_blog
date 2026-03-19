import { memo } from 'react'
import { Link } from 'react-router-dom'
import { getProgress } from '../utils/progress.js'
import './ArticleCard.css'

const STATUS_COLORS = {
  'in-progress': '#f59e0b',
  'completed': '#22c55e',
  'revision-needed': '#ef4444',
}

export default memo(function ArticleCard({ slug, title, description, date, image, section }) {
  const status = getProgress(slug)
  const dotColor = STATUS_COLORS[status]

  return (
    <Link to={`/article/${slug}`} className="article-card">
      {dotColor && <span className="card-progress-dot" style={{ background: dotColor }} />}
      {image && (
        <div className="card-image">
          <img src={image} alt={title} />
        </div>
      )}
      <div className="card-body">
        {section && <span className="card-section">{section}</span>}
        <h2 className="card-title">{title}</h2>
        <p className="card-desc">{description}</p>
        <span className="card-date">{new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>
    </Link>
  )
})
