import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '3rem', marginBottom: '1rem', color: 'var(--color-heading)' }}>404</h1>
      <p style={{ marginBottom: '1.5rem', color: 'var(--color-text-light)' }}>Page not found</p>
      <Link to="/" style={{ fontWeight: 500 }}>&larr; Back to Home</Link>
    </div>
  )
}
