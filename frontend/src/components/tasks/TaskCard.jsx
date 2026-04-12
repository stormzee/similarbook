import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import './TaskCard.css'

export default function TaskCard({ task, similarity, actions }) {
  const tags = task.tags ? task.tags.split(',').map((t) => t.trim()).filter(Boolean) : []

  return (
    <div className="task-card card">
      <div className="task-card-header">
        <div>
          <h3 className="task-title">
            <Link to={`/tasks/${task.id}`}>{task.title}</Link>
          </h3>
          {task.owner && (
            <Link to={`/profile/${task.owner.username}`} className="task-author muted">
              @{task.owner.username}
            </Link>
          )}
        </div>
        <div className="task-meta">
          {similarity != null && (
            <span className="badge badge-primary">{(similarity * 100).toFixed(0)}% match</span>
          )}
          {task.is_completed && <span className="badge">✅ Done</span>}
        </div>
      </div>
      <p className="task-description">{task.description}</p>
      {tags.length > 0 && (
        <div className="task-tags">
          {tags.map((tag) => (
            <span key={tag} className="badge">{tag}</span>
          ))}
        </div>
      )}
      <div className="task-footer muted">
        {formatDistanceToNow(new Date(task.created_at), { addSuffix: true })}
        {actions && <div className="task-actions">{actions}</div>}
      </div>
    </div>
  )
}
