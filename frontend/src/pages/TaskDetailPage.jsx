import React, { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import TaskCard from '../components/tasks/TaskCard'
import './TaskDetail.css'

export default function TaskDetailPage() {
  const { id } = useParams()
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [task, setTask] = useState(null)
  const [similars, setSimilars] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [taskResp, simResp] = await Promise.all([
          api.get(`/tasks/${id}`),
          api.get(`/tasks/similar-to/${id}?limit=5`),
        ])
        setTask(taskResp.data)
        setSimilars(simResp.data)
      } catch {}
      setLoading(false)
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return
    await api.delete(`/tasks/${id}`)
    navigate('/feed')
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />
  if (!task) return <p className="muted" style={{ textAlign: 'center', marginTop: '4rem' }}>Task not found.</p>

  const tags = task.tags ? task.tags.split(',').map(t => t.trim()).filter(Boolean) : []
  const isOwner = user?.id === task.owner_id

  return (
    <div className="task-detail-container">
      <div className="task-detail-main card">
        <div className="task-detail-header">
          <h1 className="task-detail-title">{task.title}</h1>
          {isOwner && (
            <div className="task-detail-actions">
              <Link to={`/tasks/${id}/edit`} className="btn-secondary btn-sm" style={{ display:'inline-block' }}>Edit</Link>
              <button className="btn-danger btn-sm" onClick={handleDelete}>Delete</button>
            </div>
          )}
        </div>
        {task.owner && (
          <Link to={`/profile/${task.owner.username}`} className="muted task-detail-author">
            @{task.owner.username} · {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
          </Link>
        )}
        <p className="task-detail-description">{task.description}</p>
        {tags.length > 0 && (
          <div className="task-tags" style={{ marginTop: '1rem' }}>
            {tags.map(t => <span key={t} className="badge">{t}</span>)}
          </div>
        )}
        {task.is_completed && (
          <div className="badge" style={{ marginTop: '1rem' }}>✅ Completed</div>
        )}
      </div>

      {similars.length > 0 && (
        <aside className="task-similar-section">
          <h3 className="similar-heading">Similar Tasks</h3>
          {similars.map(({ task: st, similarity }) => (
            <TaskCard key={st.id} task={st} similarity={similarity} />
          ))}
        </aside>
      )}
    </div>
  )
}
