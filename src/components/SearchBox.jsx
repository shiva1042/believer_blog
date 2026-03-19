import { useNavigate } from 'react-router-dom'
import './SearchBox.css'

export default function SearchBox({ value, onChange }) {
  const navigate = useNavigate()

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`)
    }
  }

  return (
    <div className="search-box">
      <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        type="text"
        placeholder="Search articles..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="search-input"
      />
      <a href="/search" className="advanced-search-link" onClick={(e) => { e.preventDefault(); navigate('/search'); }}>
        Advanced search &rarr;
      </a>
    </div>
  )
}
