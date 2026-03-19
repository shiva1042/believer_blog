import { lazy, Suspense, Component, useEffect, useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Home from './pages/Home.jsx'
import NotFound from './pages/NotFound.jsx'
import KeyboardShortcuts from './components/KeyboardShortcuts.jsx'
import './App.css'

// Lazy-loaded pages for code splitting
const Article = lazy(() => import('./pages/Article.jsx'))
const Editor = lazy(() => import('./pages/Editor.jsx'))
const Progress = lazy(() => import('./pages/Progress.jsx'))
const Practice = lazy(() => import('./pages/Practice.jsx'))
const Search = lazy(() => import('./pages/Search.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const Flashcards = lazy(() => import('./pages/Flashcards.jsx'))

// Error Boundary
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#666' }}>{this.state.error?.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
            style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc', background: '#f5f5f5' }}
          >
            Go to Home
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function PageLoader() {
  return (
    <div className="page-loader">
      <div className="page-loader-spinner" />
    </div>
  )
}

// Page transition wrapper — re-triggers animation on route change
function PageTransition({ children }) {
  const location = useLocation()
  const [transitionKey, setTransitionKey] = useState(location.key)

  useEffect(() => {
    setTransitionKey(location.key)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [location.key])

  return (
    <div className="page-transition" key={transitionKey}>
      {children}
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Navbar />
      <KeyboardShortcuts />
      <main className="main-content">
        <Suspense fallback={<PageLoader />}>
          <PageTransition>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/article/:slug" element={<Article />} />
              <Route path="/search" element={<Search />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/progress" element={<Progress />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </main>
      <footer className="site-footer">
        <p>&copy; {new Date().getFullYear()} Believer Blog. All rights reserved.</p>
      </footer>
    </ErrorBoundary>
  )
}

export default App
