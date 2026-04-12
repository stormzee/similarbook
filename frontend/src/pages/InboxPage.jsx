import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import './Messages.css'

export default function InboxPage() {
  const { user: me } = useAuthStore()
  const [inbox, setInbox] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/messages/inbox').then(r => {
      setInbox(r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  // Group by sender
  const bySender = inbox.reduce((acc, msg) => {
    const sid = msg.sender_id
    if (!acc[sid]) acc[sid] = { sender: msg.sender, messages: [] }
    acc[sid].messages.push(msg)
    return acc
  }, {})

  if (loading) return <div className="spinner" style={{ margin: '4rem auto' }} />

  return (
    <div className="inbox-container">
      <h2 className="inbox-heading">Messages</h2>
      {Object.entries(bySender).length === 0 && (
        <p className="muted" style={{ textAlign: 'center', marginTop: '3rem' }}>
          No messages yet. Connect with someone and start a conversation!
        </p>
      )}
      {Object.entries(bySender).map(([sid, { sender, messages }]) => {
        const last = messages[messages.length - 1]
        const unread = messages.filter(m => !m.is_read).length
        return (
          <Link key={sid} to={`/messages/${sid}`} className="inbox-item card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', textDecoration: 'none' }}>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text)' }}>{sender?.display_name || sender?.username}</p>
              <p className="muted" style={{ fontSize: '0.8rem' }}>@{sender?.username}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              {unread > 0 && <span className="badge badge-primary">{unread} new</span>}
              <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {formatDistanceToNow(new Date(last.created_at), { addSuffix: true })}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
