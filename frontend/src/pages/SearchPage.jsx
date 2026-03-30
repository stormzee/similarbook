import React, { useState, useCallback } from 'react'
import api from '../utils/api'
import TaskCard from '../components/tasks/TaskCard'
import './Search.css'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async () => {
    if (!query.trim() || query.length < 3) return
    setLoading(true)
    setSearched(true)
    try {
      const resp = await api.get('/tasks/search/similar', { params: { q: query, limit: 20 } })
      setResults(resp.data)
    } catch {}
    setLoading(false)
  }, [query])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') search()
  }

  return (
    <div className="search-container">
      <h2 className="search-heading">Find Similar Tasks</h2>
      <p className="muted search-subtitle">
        Describe what you're working on to find people with similar goals.
      </p>
      <div className="search-bar">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. building a machine learning pipeline for text classification..."
        />
        <button className="btn-primary" onClick={search} disabled={loading || query.length < 3}>
          {loading ? '…' : 'Search'}
        </button>
      </div>
      {loading && <div className="spinner" style={{ margin: '2rem auto' }} />}
      {searched && !loading && results.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', marginTop: '2rem' }}>
          No similar tasks found. Try different keywords.
        </p>
      )}
      <div className="search-results">
        {results.map(({ task, similarity }) => (
          <TaskCard key={task.id} task={task} similarity={similarity} />
        ))}
      </div>
    </div>
  )
}
