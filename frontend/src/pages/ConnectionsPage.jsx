import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import './Connections.css'

export default function ConnectionsPage() {
  const { user: me } = useAuthStore()
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/connections/').then(r => {
      setConnections(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleRespond = async (id, status) => {
    try {
      const resp = await api.patch(`/connections/${id}`, { status })
      setConnections(prev => prev.map(c => c.id === id ? resp.data : c))
    } catch {}
  }

  const handleRemove = async (id) => {
    try {
      await api.delete(`/connections/${id}`)
      setConnections(prev => prev.filter(c => c.id !== id))
    } catch {}
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />

  const pending = connections.filter(c => c.status === 'pending' && c.addressee_id === me?.id)
  const accepted = connections.filter(c => c.status === 'accepted')
  const sent = connections.filter(c => c.status === 'pending' && c.requester_id === me?.id)

  const getOther = (c) => c.requester_id === me?.id ? c.addressee : c.requester

  return (
    <div className="connections-container">
      <h2 className="connections-heading">Connections</h2>

      {pending.length > 0 && (
        <section className="connections-section">
          <h3 className="connections-subheading">Pending Requests ({pending.length})</h3>
          {pending.map(c => {
            const other = getOther(c)
            return (
              <div key={c.id} className="connection-item card">
                <Link to={`/profile/${other?.username}`} className="connection-name">
                  {other?.display_name || other?.username}
                  <span className="muted"> @{other?.username}</span>
                </Link>
                <div className="connection-actions">
                  <button className="btn-primary btn-sm" onClick={() => handleRespond(c.id, 'accepted')}>Accept</button>
                  <button className="btn-secondary btn-sm" onClick={() => handleRespond(c.id, 'rejected')}>Decline</button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {accepted.length > 0 && (
        <section className="connections-section">
          <h3 className="connections-subheading">Connected ({accepted.length})</h3>
          {accepted.map(c => {
            const other = getOther(c)
            return (
              <div key={c.id} className="connection-item card">
                <Link to={`/profile/${other?.username}`} className="connection-name">
                  {other?.display_name || other?.username}
                  <span className="muted"> @{other?.username}</span>
                </Link>
                <div className="connection-actions">
                  <Link to={`/messages/${other?.id}`} className="btn-secondary btn-sm" style={{ display:'inline-block' }}>
                    Message
                  </Link>
                  <button className="btn-secondary btn-sm" onClick={() => handleRemove(c.id)}>Remove</button>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {sent.length > 0 && (
        <section className="connections-section">
          <h3 className="connections-subheading">Sent Requests ({sent.length})</h3>
          {sent.map(c => {
            const other = getOther(c)
            return (
              <div key={c.id} className="connection-item card">
                <Link to={`/profile/${other?.username}`} className="connection-name">
                  {other?.display_name || other?.username}
                  <span className="muted"> @{other?.username}</span>
                </Link>
                <span className="badge">Pending</span>
              </div>
            )
          })}
        </section>
      )}

      {connections.length === 0 && (
        <p className="muted" style={{ textAlign: 'center', marginTop: '3rem' }}>
          No connections yet. Search for tasks and connect with people!
        </p>
      )}
    </div>
  )
}
