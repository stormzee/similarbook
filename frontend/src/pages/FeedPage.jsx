import React, { useEffect, useState } from 'react'
import api from '../utils/api'
import TaskCard from '../components/tasks/TaskCard'
import './Feed.css'

export default function FeedPage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const LIMIT = 20

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true)
      try {
        const resp = await api.get(`/tasks/feed?skip=${page * LIMIT}&limit=${LIMIT}`)
        if (page === 0) setTasks(resp.data)
        else setTasks((prev) => [...prev, ...resp.data])
      } catch {}
      setLoading(false)
    }
    fetchTasks()
  }, [page])

  return (
    <div className="feed-container">
      <h2 className="feed-heading">Recent Tasks</h2>
      {tasks.map((task) => <TaskCard key={task.id} task={task} />)}
      {loading && <div className="spinner" style={{ margin: '2rem auto' }} />}
      {!loading && tasks.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', marginTop: '3rem' }}>
          No tasks yet. Be the first to share!
        </p>
      )}
      {!loading && tasks.length === LIMIT * (page + 1) && (
        <button className="btn-secondary" style={{ width: '100%' }} onClick={() => setPage(p => p + 1)}>
          Load more
        </button>
      )}
    </div>
  )
}
