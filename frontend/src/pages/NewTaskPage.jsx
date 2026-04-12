import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import api from '../utils/api'
import './TaskForm.css'

export default function NewTaskPage() {
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    setLoading(true)
    setServerError('')
    try {
      const resp = await api.post('/tasks/', {
        title: data.title,
        description: data.description,
        tags: data.tags || undefined,
        is_public: data.is_public,
      })
      navigate(`/tasks/${resp.data.id}`)
    } catch (err) {
      setServerError(err.response?.data?.detail || 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="task-form-container">
      <div className="task-form-card card">
        <h2 className="task-form-title">Share a Task</h2>
        <p className="muted" style={{ marginBottom: '1.25rem' }}>
          Describe what you're working on so others can discover and connect with you.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label>Title *</label>
            <input
              {...register('title', {
                required: 'Title is required',
                minLength: { value: 3, message: 'Min 3 characters' },
                maxLength: { value: 200, message: 'Max 200 characters' },
              })}
              placeholder="Brief task title"
            />
            {errors.title && <span className="error-text">{errors.title.message}</span>}
          </div>
          <div className="form-group">
            <label>Description *</label>
            <textarea
              rows={6}
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 10, message: 'Min 10 characters' },
              })}
              placeholder="Describe your task in detail – what are you trying to accomplish, what challenges are you facing?"
            />
            {errors.description && <span className="error-text">{errors.description.message}</span>}
          </div>
          <div className="form-group">
            <label>Tags (comma-separated, optional)</label>
            <input {...register('tags')} placeholder="ml, python, data-pipeline" />
          </div>
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.6rem' }}>
            <input type="checkbox" id="is_public" {...register('is_public')} defaultChecked style={{ width: 'auto' }} />
            <label htmlFor="is_public" style={{ margin: 0 }}>Make this task public</label>
          </div>
          {serverError && <p className="error-text">{serverError}</p>}
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Publishing…' : 'Publish Task'}
          </button>
        </form>
      </div>
    </div>
  )
}
