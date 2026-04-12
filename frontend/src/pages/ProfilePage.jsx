import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import TaskCard from '../components/tasks/TaskCard'
import './Profile.css'

export default function ProfilePage() {
  const { username } = useParams()
  const { user: me } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [tasks, setTasks] = useState([])
  const [connection, setConnection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [profResp, connsResp] = await Promise.all([
          api.get(`/users/${username}`),
          api.get('/connections/'),
        ])
        setProfile(profResp.data)
        const userId = profResp.data.id
        const myConns = connsResp.data.filter(
          c => c.requester_id === userId || c.addressee_id === userId
        )
        setConnection(myConns[0] || null)

        if (profResp.data.id) {
          try {
            const tasksResp = await api.get('/tasks/feed?limit=20')
            setTasks(tasksResp.data.filter(t => t.owner_id === profResp.data.id))
          } catch {}
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [username])

  const handleConnect = async () => {
    setActionLoading(true)
    try {
      const resp = await api.post('/connections/', { addressee_id: profile.id })
      setConnection(resp.data)
    } catch {}
    setActionLoading(false)
  }

  const handleAccept = async () => {
    setActionLoading(true)
    try {
      const resp = await api.patch(`/connections/${connection.id}`, { status: 'accepted' })
      setConnection(resp.data)
    } catch {}
    setActionLoading(false)
  }

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />
  if (!profile) return <p className="muted" style={{ textAlign: 'center', marginTop: '4rem' }}>User not found.</p>

  const isSelf = me?.id === profile.id
  const isAccepted = connection?.status === 'accepted'
  const isPending = connection?.status === 'pending'
  const isRequester = connection?.requester_id === me?.id

  return (
    <div className="profile-container">
      <div className="profile-header card">
        <div className="profile-avatar">{(profile.display_name || profile.username)[0].toUpperCase()}</div>
        <div className="profile-info">
          <h2 className="profile-name">{profile.display_name || profile.username}</h2>
          <p className="muted">@{profile.username}</p>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
        </div>
        {!isSelf && (
          <div className="profile-actions">
            {!connection && (
              <button className="btn-primary btn-sm" onClick={handleConnect} disabled={actionLoading}>
                Connect
              </button>
            )}
            {isPending && isRequester && (
              <span className="badge">Request sent</span>
            )}
            {isPending && !isRequester && (
              <button className="btn-primary btn-sm" onClick={handleAccept} disabled={actionLoading}>
                Accept
              </button>
            )}
            {isAccepted && (
              <>
                <span className="badge badge-primary">Connected</span>
                <Link to={`/messages/${profile.id}`} className="btn-secondary btn-sm" style={{ display:'inline-block' }}>
                  Message
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <h3 className="profile-tasks-heading">Tasks by @{profile.username}</h3>
      {tasks.length === 0 && <p className="muted">No public tasks yet.</p>}
      {tasks.map(task => <TaskCard key={task.id} task={task} />)}
    </div>
  )
}
